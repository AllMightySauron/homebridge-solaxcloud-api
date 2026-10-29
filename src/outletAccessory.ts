import {
  Service,
  AccessoryPlugin,
  Logging,
  Characteristic,
  CharacteristicGetCallback,
  API,
  MatterAccessory,
  MatterAPI,
} from 'homebridge';

import { SolaxPlatformAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

import { Statistics } from './statistics.js';

import fakegato from 'fakegato-history';
import { FakeGatoHistoryService } from 'fakegato-history';
import { createRequire } from 'module';

type EveCharacteristic = (new () => Characteristic) & { UUID: string };

interface EveHomeKitTypes {
  Characteristics: {
    CurrentConsumption: EveCharacteristic;
    TotalConsumption: EveCharacteristic;
  };
  Services: {
    Outlet: new (name: string) => Service;
  };
}

const require = createRequire(import.meta.url);
const { EveHomeKitTypes } = require('homebridge-lib/EveHomeKitTypes') as {
  EveHomeKitTypes: new (api: API) => EveHomeKitTypes;
};

export interface MatterPowerSensorOptions {
  displayName: string;
  serialNumber: string;
  supportsEnergy?: boolean;
}

/**
 * Maximum size for the outlet power series.
 */
const MAX_POWER_SERIES_SIZE = 1024;

/**
 * Solax Outlet Accessory.
 * Virtual outlet used to monitor and measure both power and total energy consumption from Solax devices.
 * Outlet use is inferred from a positive power comsumption.
 */
export class SolaxOutletAccessory extends SolaxPlatformAccessory implements AccessoryPlugin {

  /** Matter API used to publish the outlet's native electrical sensor. */
  private readonly matterApi?: MatterAPI;

  /** Stable UUID for the outlet's native Matter electrical sensor. */
  private readonly matterUuid?: string;

  /** Resolves after the native Matter electrical sensor registration finishes. */
  private readonly matterRegistration?: Promise<boolean>;

  /**
   * Eve Homekit types helper
   * */
  private readonly eve: EveHomeKitTypes;

  /**
   * Eve Service for fakegato.
   */
  private readonly eveService?: fakegato;

  /**
   * Outlet service with power meter.
   */
  private readonly outletService: Service;

  /**
   * Current power reading in Watt.
   */
  private powerConsumption = 0;

  /**
   * Total energy readings in KWh.
   */
  private totalEnergyConsumption = 0.0;

  /**
   * Elgato Eve fake history service for energy and status.
   */
  private readonly loggingService?: FakeGatoHistoryService;

  /**
   * Whether fakegato history is enabled for this outlet.
   */
  private readonly enableHistory: boolean;

  /**
   * Power series for smoothing operations.
   */
  private readonly powerSeries: number[] = [];

  /**
   * Last Exponential Moving Average.
   */
  private lastEMA = 0;

  /**
   * Solax virtual outlet class constructor.
   * @param {Logging} log The platform logging for homebridge.
   * @param {API} api The API for Solax Cloud platform.
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
    enableHistory = true,
    uuidBase?: string,
    matterSensor?: MatterPowerSensorOptions,
  ) {
    super(log, api, name, serial, model, uuidBase);

    this.log.debug(`Creating outlet "${this.name}"`);

    this.enableHistory = enableHistory;

    // init fakegato objects
    this.eve = new EveHomeKitTypes(this.api);

    // create power meter service
    this.outletService = new this.eve.Services.Outlet(this.name);

    // outlet on/off state
    this.outletService.getCharacteristic(this.api.hap.Characteristic.On)
      .on(this.api.hap.CharacteristicEventTypes.GET, this.getState.bind(this));

    // in use
    //this.outletService.getCharacteristic(hap.Characteristic.OutletInUse).on(hap.CharacteristicEventTypes.GET, this.getState.bind(this));

    // current consumption
    this.outletService.getCharacteristic(this.eve.Characteristics.CurrentConsumption)
      .on(this.api.hap.CharacteristicEventTypes.GET, this.getPowerConsumption.bind(this));

    // total consumption
    this.outletService.getCharacteristic(this.eve.Characteristics.TotalConsumption)
      .on(this.api.hap.CharacteristicEventTypes.GET, this.getTotalEnergyConsumption.bind(this));

    if (this.enableHistory) {
      // history logging services
      this.eveService = fakegato(this.api);
      this.loggingService = new this.eveService('energy', this, { storage: 'fs', log: this.log, disableRepeatLastData: true } );
    }

    this.matterApi = this.api.matter;

    if (this.matterApi && matterSensor) {
      this.matterUuid = this.api.hap.uuid.generate(matterSensor.serialNumber + '-matter-power');

      const clusters: MatterAccessory['clusters'] = {
        electricalPowerMeasurement: {
          activePower: 0,
        },
      };

      if (matterSensor.supportsEnergy) {
        clusters.electricalEnergyMeasurement = {
          cumulativeEnergyExported: { energy: 0 },
        };
      }

      const matterAccessory: MatterAccessory = {
        displayName: matterSensor.displayName,
        UUID: this.matterUuid,
        deviceType: this.matterApi.deviceTypes.ElectricalSensor,
        serialNumber: matterSensor.serialNumber,
        manufacturer: 'Solax',
        model,
        context: {},
        clusters,
      };

      this.matterRegistration = this.matterApi
        .registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [matterAccessory])
        .then(() => {
          log.info(`Matter Electrical Sensor (Watts) "${matterSensor.displayName}" created!`);
          return true;
        })
        .catch(error => {
          log.error(`Failed to register Matter accessory "${matterSensor.displayName}": ${error}`);
          return false;
        });
    }

    log.info(`Outlet "${name}" created!`);
  }

  /**
   * Adds new power entry to series array of power values.
   * @param {number} powerConsumption Power value to add (in Watts).
   */
  private addPowerEntry(powerConsumption: number): void {
    // check if we reached the limit
    if (this.powerSeries.length === MAX_POWER_SERIES_SIZE) {
      // remove first element
      this.powerSeries.shift();
    }

    // add new element
    this.powerSeries.push(powerConsumption);
  }

  /**
   * Gets array series with power consumption values.
   * @returns {number[]} Array with power consumption values.
   */
  public getPowerSeries(): number[] {
    return this.powerSeries;
  }

  /**
   * Get outlet power from power series by smoothing data using the desired method and window size.
   * @param {string} method Method to smooth data ('SMA' or 'EMA').
   * @param {number} windowSize Window size for SMA or EMA.
   * @returns {number} Power value after smoothing (rounded to nearest integer number).
   */
  public getSmoothPowerConsumption(method: string, windowSize: number): number {
    this.log.debug(`${this.name}: GET Power Smooth (method=${method}, window=${windowSize})`);

    let result = 0;

    // get power series for window size
    const series = this.getPowerSeries().slice(-windowSize);

    // calculate simple moving average from given window size
    const [sma] = Statistics.simpleMovingAverage(series, Math.min(windowSize, series.length));

    // check if we have enough data for averaging
    switch (method) {
      case 'sma':
        result = sma;

        this.log.debug(`${this.name}: simple moving average (window data=[${series}], power=${result}W)`);

        break;

      case 'ema':
        if (series.length < windowSize) {
          result = sma;

          this.log.debug(`${this.name}: exponential moving average (window data=[${series}], last EMA=none, power=${result}W)`);
        } else {
          const lastPowerValue = series[series.length - 1];
          const weight = 2 / (windowSize + 1);

          result = (lastPowerValue - this.lastEMA) * weight + this.lastEMA;

          this.log.debug(`${this.name}: exponential moving average (window data=[${series}], last EMA=${this.lastEMA}, power=${result}W)`);
        }

        this.lastEMA = result;
    }

    return result;
  }

  /**
   * Gets the current power consumption value for this outlet.
   * @returns {number} Outlet power consumption (Watt).
   */
  public getPowerConsumptionValue(): number {
    return this.powerConsumption;
  }

  /**
   * Gets the current power consumpion.
   */
  public getPowerConsumption(callback: CharacteristicGetCallback): void {
    this.log.debug(`${this.name}: GET Power (power=${this.powerConsumption}W)`);

    callback(null, this.powerConsumption);
  }

  /**
   * Sets the current power consumption.
   * @param {number} powerConsumption The power consumption to set. */
  public setPowerConsumption(powerConsumption: number) {
    this.log.debug(`${this.name}: SET Power (power=${powerConsumption}W)`);

    this.powerConsumption = powerConsumption >= 0 ? powerConsumption: 0;

    this.outletService.getCharacteristic(this.eve.Characteristics.CurrentConsumption).updateValue(this.powerConsumption);

    if (this.loggingService) {
      // add entries to history
      this.loggingService.addEntry({time: Math.round(new Date().valueOf() / 1000), power: this.powerConsumption });
    }

    // add new value to power series
    this.addPowerEntry(this.powerConsumption);

    if (this.matterApi) {
      this.updateMatterState(
        this.matterApi.clusterNames.ElectricalPowerMeasurement,
        { activePower: Math.round(this.powerConsumption * 1000) },
      );
    }
  }

  /**
   * Gets the total energy consumption value for this outlet.
   * @returns {number} Outlet total energy consumption (Wh).
   */
  public getTotalEnergyConsumptionValue(): number {
    return this.totalEnergyConsumption;
  }

  /**
   * Gets the total energy consumpion.
   */
  public getTotalEnergyConsumption(callback: CharacteristicGetCallback): void {
    this.log.debug(`${this.name}: GET Total Energy (energy=${this.totalEnergyConsumption}kWh)`);

    callback(null, this.totalEnergyConsumption);
  }

  /**
   * Sets the total energy consumption.
   * @param {number} totalEnergyConsumption The total energy consumption to set.
   */
  public setTotalEnergyConsumption(totalEnergyConsumption: number) {
    this.log.debug(`${this.name}: SET Total Energy (energy=${totalEnergyConsumption}kWh)`);

    this.totalEnergyConsumption = totalEnergyConsumption;

    this.outletService.getCharacteristic(this.eve.Characteristics.TotalConsumption).updateValue(this.totalEnergyConsumption);

    if (this.matterApi) {
      this.updateMatterState(
        this.matterApi.clusterNames.ElectricalEnergyMeasurement,
        {
          cumulativeEnergyExported: {
            energy: Math.round(totalEnergyConsumption * 1000),
          },
        },
      );
    }
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
        this.log.error(`Failed to update Matter accessory for outlet "${this.name}": ${error}`);
      });
  }

  /**
   * Gets the outlet state Characteristic based on its consumed power.
   * @param {CharacteristicGetCallback} callback The callback.
   */
  public getState(callback: CharacteristicGetCallback): void {
    this.log.debug(`${this.name}: GET State (power=${this.powerConsumption}W)`);

    callback(null, this.powerConsumption > 0);
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    const services = [ this.informationService, this.outletService ];

    if (this.loggingService) {
      services.push(this.loggingService);
    }

    return services;
  }

}
