import {
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  Logging,
  MatterAccessory,
  MatterAPI,
  Service,
} from 'homebridge';

import { SolaxPlatformAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

/**
 * Solax Power Sensor Accessory (Upgraded to Matter).
 * Exposes power consumption directly to Apple Home Energy via Matter,
 * or falls back to a virtual light sensor for older HAP setups.
 */
export class SolaxLightSensorAccessory extends SolaxPlatformAccessory implements AccessoryPlugin {
  private readonly lightService?: Service;
  private readonly matterApi?: MatterAPI;
  private readonly matterUuid?: string;
  private readonly matterRegistration?: Promise<boolean>;
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
    supportsEnergy = false,
    published = true,
    uuidBase?: string,
  ) {
    super(log, api, name, serial, model, uuidBase);

    this.log.debug(`Creating power sensor "${this.name}"`);
    this.published = published;

    if (!published) {
      return;
    }

    this.matterApi = this.api.matter;

    if (this.matterApi) {
      this.matterUuid = this.api.hap.uuid.generate(serial + '-matter-power');

      const clusters: MatterAccessory['clusters'] = {
        electricalPowerMeasurement: {
          activePower: 0,
        },
      };

      if (supportsEnergy) {
        clusters.electricalEnergyMeasurement = {
          cumulativeEnergyExported: { energy: 0 },
        };
      }

      const matterAccessory: MatterAccessory = {
        displayName: name,
        UUID: this.matterUuid,
        deviceType: this.matterApi.deviceTypes.ElectricalSensor,
        serialNumber: serial,
        manufacturer: 'Solax',
        model,
        context: {},
        clusters,
      };

      this.matterRegistration = this.matterApi
        .registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [matterAccessory])
        .then(() => {
          log.info(`Matter Electrical Sensor (Watts) "${name}" created!`);
          return true;
        })
        .catch(error => {
          log.error(`Failed to register Matter accessory "${name}": ${error}`);
          return false;
        });
    } else {
      this.lightService = new this.api.hap.Service.LightSensor(name);

      this.lightService
        .getCharacteristic(this.api.hap.Characteristic.CurrentAmbientLightLevel)
        .on(CharacteristicEventTypes.GET, this.getAmbientLightLevel.bind(this));

      log.info(`Light sensor (watts reader) "${name}" created!`);
    }
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

    if (this.matterApi && this.matterUuid) {
      this.updateMatterState(
        this.matterApi.clusterNames.ElectricalPowerMeasurement,
        { activePower: Math.round(power * 1000) },
      );
    } else if (this.lightService) {
      this.lightService.updateCharacteristic(this.api.hap.Characteristic.CurrentAmbientLightLevel, Math.max(0.1, power));
    }
  }

  /**
   * Sets cumulative generated energy in Watt-hours.
   * @param {number} energyWh The cumulative generated energy in Watt-hours.
   */
  public setTotalEnergyConsumption(energyWh: number): void {
    if (!this.matterApi || !this.matterUuid) {
      return;
    }

    this.updateMatterState(
      this.matterApi.clusterNames.ElectricalEnergyMeasurement,
      {
        cumulativeEnergyExported: {
          energy: Math.round(energyWh * 1000),
        },
      },
    );
  }

  public isMatterAccessory(): boolean {
    return Boolean(this.matterApi);
  }

  private updateMatterState(cluster: string, attributes: Record<string, unknown>): void {
    if (!this.matterApi || !this.matterUuid || !this.matterRegistration) {
      return;
    }

    void this.matterRegistration
      .then(registered => {
        if (!registered) {
          return;
        }

        return this.matterApi!.updateAccessoryState(this.matterUuid!, cluster, attributes);
      })
      .catch(error => {
        this.log.error(`Failed to update Matter accessory "${this.name}": ${error}`);
      });
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    if (!this.published || this.matterApi) {
      return [ this.informationService ];
    }
    return [ this.informationService, this.lightService! ];
  }
}
