import { API, Logging, PlatformConfig } from 'homebridge';

import assert from 'assert';

import { SolaxOutletAccessory } from '../src/outletAccessory.js';
import { SolaxLightSensorAccessory } from '../src/lightSensorAccessory.js';
import { SolaxCloudAPIPlatform } from '../src/platform.js';
import { SolaxCloudAPIPlatformInverter } from '../src/platformInverter.js';
import { createApi, createLog, createMatterApi } from './helpers.js';

interface InverterCreation {
  brand: number;
  tokenId: string;
  sn: string;
  name: string;
  hasBattery: boolean;
  smoothingWindow: number;
  virtual: boolean;
  brandName?: string;
}

interface MigratedAccessory {
  name: string;
  uuid_base?: string;
}

let inverterCreations: InverterCreation[] = [];

class TestSolaxCloudAPIPlatform extends SolaxCloudAPIPlatform {
  protected createPlatformInverter(log: Logging, config: PlatformConfig, api: API,
    brand: number, tokenId: string, sn: string,
    name: string, hasBattery: boolean,
    smoothingWindow: number,
    virtual = false,
    brandName?: string): SolaxCloudAPIPlatformInverter {
    inverterCreations.push({ brand, tokenId, sn, name, hasBattery, smoothingWindow, virtual, brandName });

    return {
      getAccessories: () => [],
      hasBattery: () => hasBattery,
    } as unknown as SolaxCloudAPIPlatformInverter;
  }

  protected async fetchDataPeriodically(): Promise<void> {
    return;
  }
}

function createConfig(brands: string[]): PlatformConfig {
  return {
    platform: 'SolaxCloudAPI',
    pollingFrequency: 300,
    inverters: brands.map((brand, index) => ({
      brand,
      tokenId: `2020072218511123456789${index}`,
      name: `Test inverter ${index}`,
      sn: `ABCDEFGHI${index}`,
      hasBattery: index === 0,
    })),
  };
}

function createPlatform(config: PlatformConfig): void {
  inverterCreations = [];

  new TestSolaxCloudAPIPlatform(createLog(), config, createApi());
}

describe('SolaxCloudAPIPlatform totalizer inverter creation', () => {
  it('creates a virtual totalizer without cloud credentials when all inverters use Solax', () => {
    createPlatform(createConfig(['solax', 'solax']));

    const totalizer = inverterCreations[2];

    assert.equal(inverterCreations.length, 3);
    assert.equal(totalizer.name, 'All inverters');
    assert.equal(totalizer.tokenId, '');
    assert.equal(totalizer.virtual, true);
    assert.equal(totalizer.brandName, 'Solax');
    assert.equal(totalizer.hasBattery, true);
  });

  it('publishes and updates applicable meters through Matter without requiring pureHomeApp', async () => {
    const matter = createMatterApi();
    const config = {
      enableHistory: false,
      pureHomeApp: false,
      smoothMeters: true,
      smoothingMethod: 'sma',
    } as PlatformConfig;

    const inverter = new SolaxCloudAPIPlatformInverter(
      createLog(),
      config,
      createApi(matter.api),
      0,
      '',
      'virtual',
      'Virtual inverter',
      false,
      3,
      true,
    );

    assert.equal(matter.registrations.length, 10);
    const smoothMatterSensors = matter.registrations
      .flat()
      .filter(accessory => accessory.serialNumber.includes('-light-smooth-'));

    assert.equal(smoothMatterSensors.length, 5);
    smoothMatterSensors.forEach(accessory => assert.match(accessory.displayName, / sensor Smooth$/));

    // Each outlet owns its Matter sensor; no light-sensor accessory is published.
    const outlets = inverter.getAccessories().filter(
      (accessory): accessory is SolaxOutletAccessory => accessory instanceof SolaxOutletAccessory,
    );

    assert.equal(inverter.getAccessories().length, 11);
    assert.equal(outlets.length, 10);
    assert.equal(inverter.getAccessories().some(accessory => accessory instanceof SolaxLightSensorAccessory), false);

    inverter.setRawPower('inverterAC', 123.456);
    inverter.setSmoothPower('inverterAC');
    inverter.setRawEnergy('inverterAC', 12.345);
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(matter.updates.filter(update =>
      update.cluster === 'electricalPowerMeasurement' && update.attributes.activePower === 123456).length, 2);
    assert.equal(outlets.filter(outlet => outlet.getPowerConsumptionValue() === 123.456).length, 2);
    assert.equal(matter.updates.some(update =>
      update.cluster === 'electricalEnergyMeasurement'), true);
  });

  it('retains pureHomeApp as a non-Matter legacy fallback', () => {
    const config = {
      enableHistory: false,
      pureHomeApp: true,
      smoothMeters: false,
      smoothingMethod: 'sma',
    } as PlatformConfig;

    const inverter = new SolaxCloudAPIPlatformInverter(
      createLog(),
      config,
      createApi(),
      0,
      '',
      'virtual',
      'Virtual inverter',
      false,
      3,
      true,
    );

    assert.equal(inverter.getAccessories().length, 11);
    assert.equal(inverter.getAccessories().filter(accessory => accessory instanceof SolaxLightSensorAccessory).length, 5);
  });

  it('uses Matter outlets instead of pureHomeApp light sensors when both are configured', () => {
    const matter = createMatterApi();
    const config = {
      enableHistory: false,
      pureHomeApp: true,
      smoothMeters: false,
      smoothingMethod: 'sma',
    } as PlatformConfig;

    const inverter = new SolaxCloudAPIPlatformInverter(
      createLog(),
      config,
      createApi(matter.api),
      0,
      '',
      'virtual',
      'Virtual inverter',
      false,
      3,
      true,
    );

    assert.equal(matter.registrations.length, 5);
    assert.equal(inverter.getAccessories().length, 6);
    assert.equal(inverter.getAccessories().some(accessory => accessory instanceof SolaxLightSensorAccessory), false);
  });

  it('renames smooth HAP accessories without changing their Homebridge UUID bases', () => {
    const config = {
      enableHistory: false,
      pureHomeApp: true,
      smoothMeters: true,
      smoothingMethod: 'sma',
    } as PlatformConfig;

    const inverter = new SolaxCloudAPIPlatformInverter(
      createLog(),
      config,
      createApi(),
      0,
      '',
      'virtual',
      'Virtual inverter',
      false,
      3,
      true,
    );

    const migratedAccessories = (inverter.getAccessories() as unknown as MigratedAccessory[])
      .filter(accessory => accessory.uuid_base !== undefined);

    assert.equal(migratedAccessories.length, 10);
    migratedAccessories.forEach(accessory => {
      assert.match(accessory.name, / Smooth$/);
      assert.equal(accessory.uuid_base, accessory.name.replace(/ Smooth$/, ' (smooth)'));
    });
  });

  it('creates a virtual totalizer with QCells as brand when all inverters use QCells', () => {
    createPlatform(createConfig(['qcells', 'qcells']));

    const totalizer = inverterCreations[2];

    assert.equal(totalizer.name, 'All inverters');
    assert.equal(totalizer.tokenId, '');
    assert.equal(totalizer.virtual, true);
    assert.equal(totalizer.brandName, 'QCells');
  });

  it('creates a virtual totalizer with mixed brand name when inverter brands differ', () => {
    createPlatform(createConfig(['solax', 'qcells']));

    const totalizer = inverterCreations[2];

    assert.equal(totalizer.name, 'All inverters');
    assert.equal(totalizer.tokenId, '');
    assert.equal(totalizer.virtual, true);
    assert.equal(totalizer.brandName, 'Solax/QCells');
  });
});
