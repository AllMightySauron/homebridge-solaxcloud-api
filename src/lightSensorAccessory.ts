import { AccessoryPlugin, API, CharacteristicEventTypes, CharacteristicGetCallback, Logging, Service } from 'homebridge';

import { SolaxPlatformAccessory } from './platformAccessory';

/**
 * Solax Power Sensor Accessory (Upgraded to Matter).
 * Exposes power consumption directly to Apple Home Energy via Matter,
 * or falls back to a virtual light sensor for older HAP setups.
 */
export class SolaxLightSensorAccessory extends SolaxPlatformAccessory implements AccessoryPlugin {
  private readonly lightService?: Service;
  
  private isMatter = false;
  private matterUuid = '';
  private currentPowerW = 0;

  /**
   * Solax virtual light/power sensor class constructor.
   * @param {Logging} log The platform logging for homebridge.
   * @param {API} api The platform API.
   * @param {string} name The accessory name.
   * @param {string} serial "Real world" serial number for this accessory.
   * @param {string} model Accessory model.
   */
  constructor(log: Logging, api: API, name: string, serial: string, model: string) {
    super(log, api, name, serial, model);

    this.log.debug(`Creating power sensor "${this.name}"`);

    // Dynamické pretypovanie pre Matter API
    const matterApi = (this.api as any).matter;

    if (matterApi && typeof matterApi.registerPlatformAccessories === 'function') {
      this.isMatter = true;
      // Generujeme unikátne UUID pre Matter zariadenie
      this.matterUuid = this.api.hap.uuid.generate(serial + '-matter-power');

      const matterAccessory = {
        displayName: name,
        UUID: this.matterUuid,
        deviceType: matterApi.deviceTypes.electricalSensor,
        serialNumber: serial,
        clusters: {
          electricalPowerMeasurement: {
            activePower: 0 // Počiatočná hodnota
          }
        },
        handlers: {} // Senzor iba číta hodnoty, neovláda sa
      };

      try {
        matterApi.registerPlatformAccessories(
          'homebridge-solaxcloud-api',
          'SolaxCloudAPI',
          [matterAccessory]
        );
        log.info(`Matter Electrical Sensor (Watts) "${name}" created!`);
      } catch (e) {
        log.error(`Failed to register Matter accessory: ${e}`);
      }

    } else {
      // Záložný režim (Fallback) na pôvodný senzor svetla pre starý HomeKit
      this.lightService = new this.api.hap.Service.LightSensor(name);

      this.lightService
        .getCharacteristic(this.api.hap.Characteristic.CurrentAmbientLightLevel)
        .on(CharacteristicEventTypes.GET, this.getAmbientLightLevel.bind(this));

      log.info(`Light sensor (fallback) "${name}" created!`);
    }
  }

  /**
   * Gets the current power consumption in Watts.
   */
  public getAmbientLightLevel(callback: CharacteristicGetCallback): void {
    this.log.debug(`${this.name}: GET Power Level (W=${this.currentPowerW})`);
    
    // Apple HomeKit (HAP) netoleruje na senzore svetla nulu
    callback(null, Math.max(0.1, this.currentPowerW));
  }

  /**
   * Sets the current power consumption in Watts.
   * @param {number} power The power consumption value to set (previously lux).
   */
  public setAmbientLightLevel(power: number) {
    this.log.debug(`${this.name}: SET Power (W=${power})`);
    this.currentPowerW = power;

    const matterApi = (this.api as any).matter;

    if (this.isMatter && this.matterUuid && matterApi) {
      try {
        matterApi.updateAccessoryState(
          this.matterUuid,
          matterApi.clusters.electricalPowerMeasurement,
          {
            activePower: Math.round(power * 1000) // Matter vyžaduje odosielanie v miliwattoch (mW)
          }
        );
      } catch (e) {
        // Ignorujeme dočasné chyby aktualizácie, aby plugin nepadal
      }
    } else if (this.lightService) {
      // Pôvodná logika pre starý senzor
      this.lightService.updateCharacteristic(this.api.hap.Characteristic.CurrentAmbientLightLevel, Math.max(0.1, power));
    }
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    if (this.isMatter) {
      // Pre Matter režim vraciame len základné informácie, zvyšok si rieši Matter server
      return [ this.informationService ];
    }
    return [ this.informationService, this.lightService! ];
  }
}
