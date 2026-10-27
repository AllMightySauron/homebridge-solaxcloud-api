import assert from 'assert';

import { SolaxLightSensorAccessory } from '../src/lightSensorAccessory.js';
import { createApi, createLog, createMatterApi } from './helpers.js';

describe('SolaxLightSensorAccessory', () => {
  it('stores ambient light values and applies the HomeKit minimum', () => {
    const sensor = new SolaxLightSensorAccessory(createLog(), createApi(), 'Light sensor', 'light-1', 'Model');

    sensor.setAmbientLightLevel(0);
    sensor.getAmbientLightLevel((error, value) => {
      assert.equal(error, null);
      assert.equal(value, 0.1);
    });

    sensor.setAmbientLightLevel(123);
    sensor.getAmbientLightLevel((error, value) => {
      assert.equal(error, null);
      assert.equal(value, 123);
    });
  });

  it('exposes information and light services', () => {
    const sensor = new SolaxLightSensorAccessory(createLog(), createApi(), 'Light sensor', 'light-1', 'Model');

    assert.equal(sensor.getServices().length, 2);
    assert.equal(sensor.isMatterAccessory(), false);
  });

  it('registers and updates a Matter electrical sensor', async () => {
    const matter = createMatterApi();
    const sensor = new SolaxLightSensorAccessory(
      createLog(),
      createApi(matter.api),
      'Power sensor',
      'power-1',
      'Model',
      true,
    );

    assert.equal(sensor.getServices().length, 1);
    assert.equal(sensor.isMatterAccessory(), true);
    assert.equal(matter.registrations.length, 1);

    const accessory = matter.registrations[0][0];
    assert.equal(accessory.deviceType, matter.api.deviceTypes.ElectricalSensor);
    assert.deepEqual(accessory.clusters, {
      electricalPowerMeasurement: { activePower: 0 },
      electricalEnergyMeasurement: {
        cumulativeEnergyExported: { energy: 0 },
      },
    });

    sensor.setAmbientLightLevel(123.456);
    sensor.setTotalEnergyConsumption(12.345);
    await new Promise(resolve => setImmediate(resolve));

    assert.deepEqual(matter.updates, [
      {
        uuid: accessory.UUID,
        cluster: 'electricalPowerMeasurement',
        attributes: { activePower: 123456 },
      },
      {
        uuid: accessory.UUID,
        cluster: 'electricalEnergyMeasurement',
        attributes: {
          cumulativeEnergyExported: { energy: 12345 },
        },
      },
    ]);
  });
});
