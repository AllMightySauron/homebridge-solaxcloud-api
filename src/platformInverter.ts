import { AccessoryPlugin, API, Logging, PlatformConfig } from 'homebridge';

import { SolaxCloudAPI, SolaxCloudAPIResponse } from 'solax-cloud-api';

import { SolaxOutletAccessory } from './outletAccessory';
import { SolaxLightSensorAccessory } from './lightSensorAccessory';

import { PlatformLightSensorMeters, PlatformOutletMeters } from './platformMeters';

import { SolaxMotionAccessory } from './motionAccessory';
import { BATTERY_CHARGING_STATE, SolaxBatteryAccessory } from './batteryAccessory';

/**
 * Inverter brand.
 */
export const INVERTER_BRAND = {
  SOLAX: 0,
  QCELLS: 1,
};

/**
 * Standard names for accessories.
 */
export const ACCESSORY_KEYS = {
  pv: 'pv',
  inverterToBattery: 'inverterToBattery',
  inverterFromBattery: 'inverterFromBattery',
  inverterAC: 'inverterAC',
  inverterToGrid: 'inverterToGrid',
  inverterToHouse: 'inverterToHouse',
  gridToHouse: 'gridToHouse',
};

/**
 * Standard names for accessories.
 */
const ACCESSORY_NAMES = {
  pv: 'PV',
  inverterToBattery: 'To Battery',
  inverterFromBattery: 'From Battery',
  inverterAC: 'AC',
  inverterToGrid: 'To Grid',
  inverterToHouse: 'To House',
  gridToHouse: 'From Grid',
};

/**
 * Standar prefixes for accessory serials.
 */
const ACCESSORY_SERIAL_PREFIXES = {
  pv: 'pv',
  inverterToBattery: 'inv-tobat',
  inverterFromBattery: 'inv-frombat',
  inverterAC: 'inv-ac',
  inverterToGrid: 'inv-grid',
  inverterToHouse: 'inv-house',
  gridToHouse: 'grid-house',
};

/**
 * SolaxCloudAPIPlatformInverter.
 * This class is the main constructor for your inverter accessories
 * to be used by Homebridge.
 */
export class SolaxCloudAPIPlatformInverter {
  private readonly log: Logging;
  private readonly config: PlatformConfig;
  private readonly api: API;

  /**
   * Inverter name.
   */
  private name: string;

  /**
   * Inverter serial number.
   **/
  private sn: string;

  /**
   * Whether this inverter has a battery.
   **/
  private batteryInstalled: boolean;

  /**
   * Size of window for statistical smoothing operations.
   */
  private smoothingWindow: number;

  /**
   * API for retrieving data from Solax cloud.
   */
  private solaxCloudAPI?: SolaxCloudAPI;

  /**
   * Inverter brand name.
   */
  private brandName: string;

  /**
   * Whether this inverter is a virtual accessory.
   */
  private virtual: boolean;

  /**
   * Virtual motion sensor triggered by data updates from Solax Cloud.
   */
  private motionUpdate!: SolaxMotionAccessory;

  /**
   * Battery information for this inverter gathered from Solax Cloud.
   */
  private battery!: SolaxBatteryAccessory;

  /**
   * Outlets with raw data gathered from Solax Cloud.
   */
  private rawOutlets!: PlatformOutletMeters;

  /**
    * Smooth data outlets.
    */
  private smoothOutlets!: PlatformOutletMeters;

  /**
    * Sensors for Power Consumption (Apple Home Energy via Matter or Fallback Light Sensor).
    */
  private rawLightSensors!: PlatformLightSensorMeters;

  /**
    * Sensors for smooth power consumption.
    */
  private smoothLightSensors!: PlatformLightSensorMeters;

  /** Array with all accessories */
  private solaxAccessories: AccessoryPlugin[] = [];

  constructor (log: Logging, config: PlatformConfig, api: API,
    brand: number, tokenId: string, sn: string,
    name: string, hasBattery: boolean,
    smoothingWindow: number,
    virtual = false,
    brandName = SolaxCloudAPIPlatformInverter.getInverterBrandName(brand)) {
    
    this.log = log;
    this.config = config;
    this.api = api;

    this.sn = sn.toLowerCase();
    this.name = name;
    this.brandName = brandName;
    this.virtual = virtual;

    this.smoothingWindow = smoothingWindow;
    this.batteryInstalled = hasBattery;

    this.log.info(`Initialing acessories for inverter "${name}" (SN="${sn}") from ${this.brandName}...`);

    let inverterModel = 'Unknown';

    if (!this.virtual) {
      this.solaxCloudAPI = new SolaxCloudAPI(brand, tokenId, sn);
      const apiData = this.solaxCloudAPI.getAPIData();
      this.log.debug(`apiData = ${JSON.stringify(apiData)}`);

      if (apiData.success) {
        inverterModel = SolaxCloudAPI.getInverterType(apiData.result.inverterType);
      } else {
        this.log.info(`Could not retrieve initial values from ${this.brandName} Cloud, accessory Serial Number and Model properties deferred...`);
      }
    }

    this.rawOutlets = {
      pv: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.pv}`, `${ACCESSORY_SERIAL_PREFIXES.pv}-${this.sn}`, inverterModel, this.config.enableHistory),
      inverterFromBattery: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterFromBattery}`, `${ACCESSORY_SERIAL_PREFIXES.inverterFromBattery}-${this.sn}`, inverterModel, this.config.enableHistory),
      inverterToBattery: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToBattery}`, `${ACCESSORY_SERIAL_PREFIXES.inverterToBattery}-${this.sn}`, inverterModel, this.config.enableHistory),
      inverterAC: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterAC}`, `${ACCESSORY_SERIAL_PREFIXES.inverterAC}-${this.sn}`, inverterModel, this.config.enableHistory),
      inverterToGrid: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToGrid}`, `${ACCESSORY_SERIAL_PREFIXES.inverterToGrid}-${this.sn}`, inverterModel, this.config.enableHistory),
      inverterToHouse: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToHouse}`, `${ACCESSORY_SERIAL_PREFIXES.inverterToHouse}-${this.sn}`, inverterModel, this.config.enableHistory),
      gridToHouse: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.gridToHouse}`, `${ACCESSORY_SERIAL_PREFIXES.gridToHouse}-${this.sn}`, inverterModel, this.config.enableHistory),
    };

    this.motionUpdate = new SolaxMotionAccessory(this.log, this.api, `${this.name} Update`, `update-${this.sn}`, inverterModel);

    this.solaxAccessories = [ this.rawOutlets.pv, this.rawOutlets.inverterAC, this.rawOutlets.inverterToGrid, this.rawOutlets.inverterToHouse, this.rawOutlets.gridToHouse, this.motionUpdate ];

    if (this.hasBattery()) {
      this.battery = new SolaxBatteryAccessory(this.log, this.api, `${this.name} Battery`, `bat-${this.sn}`, inverterModel);
      this.solaxAccessories.push(this.battery, this.rawOutlets.inverterFromBattery, this.rawOutlets.inverterToBattery);
    }

    if (this.config.pureHomeApp) {
      this.rawLightSensors = {
        pv: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.pv} sensor`, `${ACCESSORY_SERIAL_PREFIXES.pv}-light-${this.sn}`, inverterModel),
        inverterFromBattery: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterFromBattery} sensor`, `${ACCESSORY_SERIAL_PREFIXES.inverterFromBattery}-light-${this.sn}`, inverterModel),
        inverterToBattery: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToBattery} sensor`, `${ACCESSORY_SERIAL_PREFIXES.inverterToBattery}-light-${this.sn}`, inverterModel),
        inverterAC: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterAC} sensor`, `${ACCESSORY_SERIAL_PREFIXES.inverterAC}-light-${this.sn}`, inverterModel),
        inverterToGrid: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToGrid} sensor`, `${ACCESSORY_SERIAL_PREFIXES.inverterToGrid}-light-${this.sn}`, inverterModel),
        inverterToHouse: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToHouse} sensor`, `${ACCESSORY_SERIAL_PREFIXES.inverterToHouse}-light-${this.sn}`, inverterModel),
        gridToHouse: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.gridToHouse} sensor`, `${ACCESSORY_SERIAL_PREFIXES.gridToHouse}-light-${this.sn}`, inverterModel),
      };

      this.solaxAccessories.push(this.rawLightSensors.pv, this.rawLightSensors.inverterAC, this.rawLightSensors.inverterToGrid, this.rawLightSensors.inverterToHouse, this.rawLightSensors.gridToHouse);

      if (this.batteryInstalled) {
        this.solaxAccessories.push(this.rawLightSensors.inverterFromBattery, this.rawLightSensors.inverterToBattery);
      }

      if (this.config.smoothMeters) {
        this.smoothLightSensors = {
          pv: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.pv} sensor (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.pv}-light-smooth-${this.sn}`, inverterModel),
          inverterFromBattery: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterFromBattery} sensor (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.inverterFromBattery}-light-smooth-${this.sn}`, inverterModel),
          inverterToBattery: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToBattery} sensor (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.inverterToBattery}-light-smooth-${this.sn}`, inverterModel),
          inverterAC: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterAC} sensor (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.inverterAC}-light-smooth-${this.sn}`, inverterModel),
          inverterToGrid: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToGrid} sensor (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.inverterToGrid}-light-smooth-${this.sn}`, inverterModel),
          inverterToHouse: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToHouse} sensor (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.inverterToHouse}-light-smooth-${this.sn}`, inverterModel),
          gridToHouse: new SolaxLightSensorAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.gridToHouse} sensor (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.gridToHouse}-light-smooth-${this.sn}`, inverterModel),
        };
        this.solaxAccessories.push(this.smoothLightSensors.pv, this.smoothLightSensors.inverterAC, this.smoothLightSensors.inverterToGrid, this.smoothLightSensors.inverterToHouse, this.smoothLightSensors.gridToHouse);
        if (this.batteryInstalled) {
          this.solaxAccessories.push(this.smoothLightSensors.inverterFromBattery, this.smoothLightSensors.inverterToBattery);
        }
      }
    } else {
      if (this.config.smoothMeters) {
        this.smoothOutlets = {
          pv: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.pv} (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.pv}-smooth-${this.sn}`, inverterModel, this.config.enableHistory),
          inverterFromBattery: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterFromBattery} (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.inverterFromBattery}-smooth-${this.sn}`, inverterModel, this.config.enableHistory),
          inverterToBattery: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToBattery} (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.inverterToBattery}-smooth-${this.sn}`, inverterModel, this.config.enableHistory),
          inverterAC: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterAC} (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.inverterAC}-smooth-${this.sn}`, inverterModel, this.config.enableHistory),
          inverterToGrid: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToGrid} (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.inverterToGrid}-smooth-${this.sn}`, inverterModel, this.config.enableHistory),
          inverterToHouse: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.inverterToHouse} (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.inverterToHouse}-smooth-${this.sn}`, inverterModel, this.config.enableHistory),
          gridToHouse: new SolaxOutletAccessory(this.log, this.api, `${this.name} ${ACCESSORY_NAMES.gridToHouse} (smooth)`, `${ACCESSORY_SERIAL_PREFIXES.gridToHouse}-smooth-${this.sn}`, inverterModel, this.config.enableHistory),
        };
        this.solaxAccessories.push(this.smoothOutlets.pv, this.smoothOutlets.inverterAC, this.smoothOutlets.inverterToGrid, this.smoothOutlets.inverterToHouse, this.smoothOutlets.gridToHouse);
        if (this.batteryInstalled) {
          this.solaxAccessories.push(this.smoothOutlets.inverterFromBattery, this.smoothOutlets.inverterToBattery);
        }
      }
    }
  }

  public static getInverterBrandName(brand: number): string {
    switch(brand) {
      case INVERTER_BRAND.QCELLS:
        return 'QCells';
      default:
        return 'Solax';
    }
  }

  private updateAccessories(apiData: SolaxCloudAPIResponse) {
    this.setRawPower(ACCESSORY_KEYS.pv, SolaxCloudAPI.getPVPower(apiData.result));
    this.setRawPower(ACCESSORY_KEYS.inverterFromBattery, SolaxCloudAPI.getInverterPowerFromBattery(apiData.result));
    this.setRawPower(ACCESSORY_KEYS.inverterToBattery, SolaxCloudAPI.getInverterPowerToBattery(apiData.result));
    this.setRawPower(ACCESSORY_KEYS.inverterAC, SolaxCloudAPI.getInverterACPower(apiData.result));
    this.setRawEnergy(ACCESSORY_KEYS.inverterAC, SolaxCloudAPI.getYieldTotal(apiData.result));
    this.setRawPower(ACCESSORY_KEYS.inverterToGrid, SolaxCloudAPI.getInverterPowerToGrid(apiData.result));
    this.setRawPower(ACCESSORY_KEYS.inverterToHouse, SolaxCloudAPI.getInverterPowerToHouse(apiData.result));
    this.setRawPower(ACCESSORY_KEYS.gridToHouse, SolaxCloudAPI.getGridPowerToHouse(apiData.result));

    if (this.config.smoothMeters) {
      this.setSmoothPower(ACCESSORY_KEYS.pv);
      this.setSmoothPower(ACCESSORY_KEYS.inverterFromBattery);
      this.setSmoothPower(ACCESSORY_KEYS.inverterToBattery);
      this.setSmoothPower(ACCESSORY_KEYS.inverterAC);
      this.setSmoothPower(ACCESSORY_KEYS.inverterToGrid);
      this.setSmoothPower(ACCESSORY_KEYS.inverterToHouse);
      this.setSmoothPower(ACCESSORY_KEYS.gridToHouse);
    }

    if (this.hasBattery()) {
      this.setBatteryLevel(SolaxCloudAPI.getBatterySoC(apiData.result));

      if (this.getRawPower(ACCESSORY_KEYS.inverterToBattery) > 0) {
        this.setBatteryChargeState(BATTERY_CHARGING_STATE.CHARGING);
      } else if (this.getRawPower(ACCESSORY_KEYS.inverterFromBattery) > 0) {
        this.setBatteryChargeState(BATTERY_CHARGING_STATE.NOT_CHARGING);
      } else {
        this.setBatteryChargeState(BATTERY_CHARGING_STATE.NOT_CHARGEABLE);
      }
    }

    this.setMotionUpdate();
  }

  public setBatteryChargeState(state: number) {
    this.battery.setChargeState(state);
  }

  public getBatteryChargeState(): number {
    return this.battery.getChargeStateValue();
  }

  public setBatteryLevel(percentage: number) {
    this.battery.setLevel(percentage);
  }

  public getBatteryLevel(): number {
    return this.battery.getLevelValue();
  }

  public setMotionUpdate() {
    this.motionUpdate.setState(true);
  }

  public getRawPower(key: string): number {
    return this.rawOutlets[key].getPowerConsumptionValue();
  }

  public setRawPower(key: string, power: number) {
    this.rawOutlets[key].setPowerConsumption(power);

    if (this.config.pureHomeApp) {
      this.rawLightSensors[key].setAmbientLightLevel(power);
      
      // Integrácia odosielania histórie energie (TotalEnergy) do Matter senzora
      const matterApi = (this.api as any).matter;
      const lightSensor = this.rawLightSensors[key] as any;
      if (lightSensor.isMatter && lightSensor.matterUuid && matterApi) {
        try {
           const energyWh = this.rawOutlets[key].getTotalEnergyConsumptionValue();
           matterApi.updateAccessoryState(
             lightSensor.matterUuid,
             matterApi.clusters.electricalEnergyMeasurement,
             {
               cumulativeEnergy: { energy: Math.round(energyWh * 1000) } // Wh na mWh
             }
           );
        } catch(e) {}
      }
    }
  }

  public getRawEnergy(key: string): number {
    return this.rawOutlets[key].getTotalEnergyConsumptionValue();
  }

  public setRawEnergy(key: string, energy: number) {
    this.rawOutlets[key].setTotalEnergyConsumption(energy);
  }

  public setSmoothPower(key: string) {
    const smoothPower = this.rawOutlets[key].getSmoothPowerConsumption(this.config.smoothingMethod, this.smoothingWindow);

    if (this.config.pureHomeApp) {
      this.smoothLightSensors[key].setAmbientLightLevel(smoothPower);
    } else {
      this.smoothOutlets[key].setPowerConsumption(smoothPower);
    }
  }

  public updateInverterDataFromCloud() {
    try {
      if (this.virtual || !this.solaxCloudAPI) {
        return;
      }
      this.log.info(`Retrieving data from ${this.brandName} Cloud API for inverter "${this.name}" (SN="${this.sn}")`);
      const apiData = this.solaxCloudAPI.getAPIData();

      if (apiData.success) {
        this.log.debug(`Retrieved inverter status: ${JSON.stringify(apiData.result)}`);
        this.updateAccessories(apiData);
      } else {
        throw new Error(apiData.exception);
      }
    } catch (error) {
      this.log.error(`Failed to read from ${this.brandName} Cloud API for inverter "${this.name}" (SN="${this.sn})". Error: ${error}`);
    }
  }

  public hasBattery(): boolean {
    return this.batteryInstalled;
  }

  public getAccessories(): AccessoryPlugin[] {
    return this.solaxAccessories;
  }
}
