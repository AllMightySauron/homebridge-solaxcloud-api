import { Service, AccessoryPlugin, Logging, API } from 'homebridge';

import { Util } from './util.js';

import os from 'os';
import hash from 'string-hash-64';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const plugin = require('../package.json');

/**
 * Solax Cloud generic platform accessory.
 * Handles basic info: accessory name, manufacturer (Solax), inverter model and serial number.
 */
export class SolaxPlatformAccessory implements AccessoryPlugin {
  /**
   * Accessory logging.
   */
  protected readonly log: Logging;

  /**
   * Platform API.
   */
  protected readonly api: API;

  /**
   * Accessory name.
   */
  protected readonly name: string;

  /**
   * Acessory display name.
   */
  protected readonly displayName: string;

  /**
   * Optional stable UUID seed used by Homebridge for accessory migrations.
   */
  public readonly uuid_base?: string;

  /**
   * Real-world accessory serial number.
   */
  protected trueSerialNumber: string;

  /**
   * Accessory serial number (string from 64 bit hash)
   */
  protected serialNumber: string;

  /**
   * Accessory model.
   */
  protected model = 'Solax inverter';

  /**
   * Accessory HomeKit information service.
   */
  protected readonly informationService: Service;

  /**
   * Virtual accessory main class constructor.
   * @param {Logging} log The platform logging for homebridge.
   * @param {API} api The API for Solax Cloud platform.
   * @param {string} name The accessory name.
   * @param {string} serial "Real-world" serial number for this accessory.
   * @param {string} model Accessory model.
   */
  constructor(log: Logging, api: API, name: string, serialNumber: string, model: string, uuidBase?: string) {
    this.api = api;
    this.log = log;

    // name
    this.name = name;

    // display name
    this.displayName = name;

    // Keep the previous Homebridge UUID when an accessory is renamed.
    this.uuid_base = uuidBase;

    // serial
    this.trueSerialNumber = serialNumber;

    // hash "real-world" serial and hostname to 64 bit hex string
    this.serialNumber = hash(`${serialNumber}-${os.hostname()}`).toString(16);

    // remove non-standard chars from model name
    this.model = Util.normalizeName(model);

    // information service
    this.informationService =
      new this.api.hap.Service.AccessoryInformation()
        .setCharacteristic(this.api.hap.Characteristic.Name, this.name)
        .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'Solax')
        .setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, plugin.version)
        .setCharacteristic(this.api.hap.Characteristic.SerialNumber, this.serialNumber)
        .setCharacteristic(this.api.hap.Characteristic.Model, this.model);

    this.informationService.getCharacteristic(this.api.hap.Characteristic.SerialNumber).onGet(this.getSerial.bind(this));
    this.informationService.getCharacteristic(this.api.hap.Characteristic.Model).onGet(this.getModel.bind(this));
  }

  /**
   * Handle requests to get the current value of the "Model" characteristic.
   * @returns {string} The model.
   */
  public getModel(): string {
    this.log.debug(`${this.name}: GET Model (model=${this.model})`);

    return this.model;
  }

  /**
   * Sets the model string for Model characteristic.
   * @param {string} model Model to set.
   */
  public setModel(model: string) {
    this.log.debug(`${this.name}: SET Model (model=${model})`);


    this.model = model;
    this.informationService.setCharacteristic(this.api.hap.Characteristic.Model, model);
  }

  /**
   * Handle requests to get the current value of the "SerialNumber" characteristic.
   * @returns {string} The inverter serial number.
   */
  public getSerial(): string {
    this.log.debug(`${this.name}: GET Serial (serial=${this.serialNumber})`);

    return this.serialNumber;
  }

  /**
   * Sets model serial information for this outlet.
   * @param {string} serial Serial number to set.
   */
  public setSerial(serial: string) {
    this.log.debug(`${this.name}: SET Serial (serial=${serial})`);

    this.serialNumber = serial;
    this.informationService.setCharacteristic(this.api.hap.Characteristic.SerialNumber, serial);
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log.info(`${this.name}: Identify (true serial=${this.trueSerialNumber}, serial=${this.serialNumber})`);
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [ this.informationService ];
  }

}
