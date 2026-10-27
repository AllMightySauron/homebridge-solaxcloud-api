import { SolaxLightSensorAccessory } from './lightSensorAccessory.js';
import { SolaxOutletAccessory } from './outletAccessory.js';

/**
 * Interface with outlets exposed by the platform.
 */
export interface PlatformOutletMeters {
  /**
   * Virtual outlet used to detect and measure photovoltaic production.
   */
  pv: SolaxOutletAccessory;

  /**
   * Virtual outlet used to measure DC power sent to battery.
   */
  inverterToBattery: SolaxOutletAccessory;

  /**
   * Virtual outlet used to measure DC power sent to battery.
   */
  inverterFromBattery: SolaxOutletAccessory;

  /**
   * Virtual outlet used to detect and measure inverter AC production.
   */
  inverterAC: SolaxOutletAccessory;

  /**
   * Virtual outlet used to detect and measure inverter excess production injected in the grid.
   */
  inverterToGrid: SolaxOutletAccessory;

  /**
   * Virtual outlet used to detect and measure inverter production directly fed into the house (self-consumption).
   */
  inverterToHouse: SolaxOutletAccessory;

  /**
   * Virtual outlet used to detect and measure grid power fed into the house.
   */
  gridToHouse: SolaxOutletAccessory;
}

/**
 * Interface with lights sensors exposed by the platform.
 */
export interface PlatformLightSensorMeters {
  /**
   * Virtual ambient light meter used to detect and measure photovoltaic production.
   */
  pv: SolaxLightSensorAccessory;

  /**
 * Virtual ambient light meter used to measure DC power sent to battery.
 */
  inverterToBattery: SolaxLightSensorAccessory;

  /**
   * Virtual ambient light meter used to measure DC power sent to battery.
   */
  inverterFromBattery: SolaxLightSensorAccessory;

  /**
   * Virtual ambient light meter used to detect and measure inverter AC production.
   */
  inverterAC: SolaxLightSensorAccessory;

  /**
   * Virtual ambient light meter used to detect and measure inverter excess production injected in the grid.
   */
  inverterToGrid: SolaxLightSensorAccessory;

  /**
   * Virtual ambient light meter used to detect and measure inverter production directly fed into the house (self-consumption).
   */
  inverterToHouse: SolaxLightSensorAccessory;

  /**
   * Virtual ambient light meter used to detect and measure grid power fed into the house.
   */
  gridToHouse: SolaxLightSensorAccessory;
}
