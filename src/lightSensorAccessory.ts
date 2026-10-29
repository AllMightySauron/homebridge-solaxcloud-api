import {
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  Logging,
  Service,
} from 'homebridge';

import { SolaxPlatformAccessory } from './platformAccessory.js';

/**
 * Solax legacy light sensor accessory.
 * Exposes power as ambient light for the pure Home app option.
 */
export class SolaxLightSensorAccessory extends SolaxPlatformAccessory implements AccessoryPlugin {
  private readonly lightService: Service;
  private readonly published: boolean;
  private currentPowerW = 0;

  /**
   * Solax virtual light/power sensor class constructor.
   * @param {Logging} log The platform logging for homebridge.
   * @param {API} api The platform API.
   * @param {string} name The accessory name.
   * @param {string} serial "Real world" serial number for this accessory.
   * @param {string} model Accessory model.
   */
  constructor(
    log: Logging,
    api: API,
    name: string,
    serial: string,
    model: string,
    published = true,
    uuidBase?: string,
  ) {
    super(log, api, name, serial, model, uuidBase);

    this.log.debug(`Creating power sensor "${this.name}"`);
    this.published = published;

    if (!published) {
      this.lightService = new this.api.hap.Service.LightSensor(name);
      return;
    }

    this.lightService = new this.api.hap.Service.LightSensor(name);

    this.lightService
      .getCharacteristic(this.api.hap.Characteristic.CurrentAmbientLightLevel)
      .on(CharacteristicEventTypes.GET, this.getAmbientLightLevel.bind(this));

    log.info(`Light sensor (watts reader) "${name}" created!`);
  }

  /**
   * Gets the current power consumption in Watts.
   */
  public getAmbientLightLevel(callback: CharacteristicGetCallback): void {
    this.log.debug(`${this.name}: GET Power Level (W=${this.currentPowerW})`);

    callback(null, Math.max(0.1, this.currentPowerW));
  }

  /**
   * Sets the current power consumption in Watts.
   * @param {number} power The power consumption value to set (previously lux).
   */
  public setAmbientLightLevel(power: number) {
    this.log.debug(`${this.name}: SET Power (W=${power})`);
    this.currentPowerW = power;

    this.lightService.updateCharacteristic(this.api.hap.Characteristic.CurrentAmbientLightLevel, Math.max(0.1, power));
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    if (!this.published) {
      return [ this.informationService ];
    }
    return [ this.informationService, this.lightService ];
  }
}
