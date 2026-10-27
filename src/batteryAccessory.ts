import { AccessoryPlugin, API, CharacteristicEventTypes, CharacteristicGetCallback, Logging, Service } from 'homebridge';

import { SolaxPlatformAccessory } from './platformAccessory.js';

/**
 * Enum with possible battery charging states.
 */
export const BATTERY_CHARGING_STATE = {
  NOT_CHARGING: 0,
  CHARGING:	1,
  NOT_CHARGEABLE: 2,
};

/**
 * Minimum battery charge level for triggering a low battery level.
 */
const LOW_BATTERY_THRESHOLD = 10;

/**
 * Solax Battery Accessory.
 * Battery sensor used to monitor inverter battery state of charge (SoC).
 */
export class SolaxBatteryAccessory extends SolaxPlatformAccessory implements AccessoryPlugin {
  /**
   * The battery service for Homekit.
   **/
  private readonly batteryService: Service;

  /**
   * The battery charge level (in percentage).
   */
  private batteryLevel = 0;

  /**
   * Ambient light level.
   */
  private batteryChargeState = BATTERY_CHARGING_STATE.NOT_CHARGING;

  /**
   * Solax virtual light sensor class constructor.
   * @param {Logging} log The platform logging for homebridge.
   * @param {API} api The platform API.
   * @param {string} name The accessory name.
   * @param {string} serial "Real world" serial number for this accessory.
   * @param {string} model Accessory model.
   */
  constructor(log: Logging, api: API, name: string, serial: string, model: string) {
    super(log, api, name, serial, model);

    this.log.debug(`Creating battery "${this.name}"`);

    this.batteryService = new this.api.hap.Service.Battery(name);

    // handler for getting battery level
    this.batteryService
      .getCharacteristic(this.api.hap.Characteristic.BatteryLevel)
      .on(CharacteristicEventTypes.GET, this.getLevel.bind(this));

    // handler for charging state
    this.batteryService
      .getCharacteristic(this.api.hap.Characteristic.ChargingState)
      .on(CharacteristicEventTypes.GET, this.getChargeState.bind(this));

    // handler for low battery
    this.batteryService.getCharacteristic(this.api.hap.Characteristic.StatusLowBattery)
      .onGet(this.getStatusLowBattery.bind(this));

    log.info(`Battery "${name}" created!`);
  }

  /**
   * Handle requests to get the current value of the "Status Low Battery" characteristic.
   */
  public getStatusLowBattery(): number {
    this.log.debug(`${this.name}: GET Status Low Battery`);

    let status: number;

    // set this to a valid value for StatusLowBattery
    if (this.getLevelValue() >= LOW_BATTERY_THRESHOLD) {
      status = this.api.hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    } else {
      status = this.api.hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
    }

    return status;
  }

  /**
   * Gets the battery level value.
   * @returns {number} Battery level value (as percentage).
   */
  public getLevelValue(): number {
    return this.batteryLevel;
  }

  /**
   * Handler for getting the current battery level (percentage).
   */
  public getLevel(callback: CharacteristicGetCallback): void {
    this.log.debug(`${this.name}: GET Level (percentage=${this.batteryLevel})`);

    callback(null, this.batteryLevel);
  }

  /**
   * Sets the current battery level.
   * @param {number} percentage The battery percentage level to set.
   */
  public setLevel(percentage: number) {
    this.log.debug(`${this.name}: SET Level (percentage=${percentage})`);

    this.batteryLevel = percentage;

    this.batteryService.updateCharacteristic(this.api.hap.Characteristic.BatteryLevel, this.batteryLevel);
  }

  /**
   * Handler for getting the current battery charging state.
   */
  public getChargeState(callback: CharacteristicGetCallback): void {
    this.log.debug(`${this.name}: GET Charge State (status=${this.batteryChargeState})`);

    callback(null, this.batteryChargeState);
  }

  /**
   * Sets the battery charging state according to predefined characteristic constants:
   * @param state {number} The desired charging state.
   */
  public setChargeState(state: number) {
    this.log.debug(`${this.name}: SET Charge State (state=${state})`);

    this.batteryChargeState = state;

    this.batteryService.updateCharacteristic(this.api.hap.Characteristic.ChargingState, state);
  }

  /**
   * Gets the battery current charge state.
   * @returns {number} The current battery charge state.
   */
  public getChargeStateValue(): number {
    return this.batteryChargeState;
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [ this.informationService, this.batteryService ];
  }

}
