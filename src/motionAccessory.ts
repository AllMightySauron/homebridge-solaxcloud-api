import { Service, AccessoryPlugin, Logging, CharacteristicGetCallback, API } from 'homebridge';

import util from 'util';

import { SolaxPlatformAccessory } from './platformAccessory.js';

/**
 * Motion timeout in seconds.
 */
const MOTION_TIMEOUT = 5;

/**
 * Solax Motion Accessory.
 * Virtual motion sensor triggered whenever new data is fetched from Solax Cloud.
 * Sensor will automatically clear itself after MOTION_TIMEOUT seconds (defaults to 5 seconds).
 */
export class SolaxMotionAccessory extends SolaxPlatformAccessory implements AccessoryPlugin {

  /**
   * Homekit Motion Service for this accessory.
   */
  private readonly motionService: Service;

  /**
   * Whether motion is detected (Solax Cloud data updated).
   */
  private motion = false;

  /**
   * Interval before clearing motion (in seconds).
   */
  private motionTimeout: number = MOTION_TIMEOUT;

  /**
   * Solax virtual motion sensor class constructor.
   * @param {Logging} log The platform logging for homebridge.
   * @param {API} api The API for Solax Cloud platform.
   * @param {string} name The accessory name.
   * @param {string} serial "Real-world" serial number for this accessory.
   * @param {string} model Accessory model.
   */
  constructor(log: Logging, api: API, name: string, serial: string, model: string) {
    super(log, api, name, serial, model);

    this.log.debug(`Creating motion sensor "${this.name}"`);

    this.motionService = new this.api.hap.Service.MotionSensor(this.name);
    this.motionService
      .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
      .on(this.api.hap.CharacteristicEventTypes.GET, this.getState.bind(this));

    log.info(`Motion sensor "${name}" created!`);
  }

  sleep = util.promisify(setTimeout);

  /**
   * Gets the motion sensor state Characteristic.
   * @param {CharacteristicGetCallback} callback The callback.
   */
  public getState(callback: CharacteristicGetCallback): void {
    this.log.debug(`${this.name}: GET State (motion=${this.motion})`);

    callback(null, this.motion);
  }

  /**
   * Sets the motion sensor state.
   * @param {boolean} motion Whether motion was detected.
   */
  public setState(motion: boolean) {
    this.log.debug(`${this.name}: SET State (motion=${motion})`);

    this.motionService
      .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
      .updateValue(motion);

    this.motion = motion;

    if (this.motion) {
      // turn it off after timeout
      this.sleep(this.motionTimeout * 1000).then(() => this.setState(false));
    }
  }

  /**
   * Sets the motion timeout.
   * @param {number} timeout Number of seconds before clearing motion.
   */
  setMotionTimeout(timeout: number) {
    this.motionTimeout = timeout;
  }

  /**
   * Gets the motion timeout.
   * @return {number}  Number of seconds before clearing motion.
   */
  getMotionTimeout(): number {
    return this.motionTimeout;
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.motionService,
    ];
  }

}
