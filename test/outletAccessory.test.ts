import assert from 'assert';
import { SolaxOutletAccessory } from '../src/outletAccessory.js';
import { createApi, createLog, createMatterApi } from './helpers.js';

describe('SolaxOutletAccessory', () => {
  function withOutlet(test: (outlet: SolaxOutletAccessory) => void): void {
    const api = createApi();
    const outlet = new SolaxOutletAccessory(createLog(), api, 'Outlet', 'outlet-1', 'Model');

    try {
      test(outlet);
    } finally {
      api['globalFakeGatoTimer']?.stop();
    }
  }

  it('stores power values, clamps negative power, and tracks power series', () => {
    withOutlet(outlet => {
      outlet.setPowerConsumption(-10);
      assert.equal(outlet.getPowerConsumptionValue(), 0);

      outlet.getState((error, value) => {
        assert.equal(error, null);
        assert.equal(value, false);
      });

      outlet.setPowerConsumption(42);
      assert.equal(outlet.getPowerConsumptionValue(), 42);
      assert.deepEqual(outlet.getPowerSeries(), [0, 42]);

      outlet.getState((error, value) => {
        assert.equal(error, null);
        assert.equal(value, true);
      });
    });
  });

  it('stores total energy consumption', () => {
    withOutlet(outlet => {
      outlet.setTotalEnergyConsumption(12.5);
      assert.equal(outlet.getTotalEnergyConsumptionValue(), 12.5);

      outlet.getTotalEnergyConsumption((error, value) => {
        assert.equal(error, null);
        assert.equal(value, 12.5);
      });
    });
  });

  it('calculates smoothed power from the stored power series', () => {
    withOutlet(outlet => {
      outlet.setPowerConsumption(10);
      outlet.setPowerConsumption(20);
      outlet.setPowerConsumption(30);

      assert.equal(outlet.getSmoothPowerConsumption('sma', 3), 20);
      assert.equal(outlet.getSmoothPowerConsumption('ema', 3), 15);
    });
  });

  it('exposes information, outlet, and history services', () => {
    withOutlet(outlet => {
      assert.equal(outlet.getServices().length, 3);
    });
  });

  it('does not create history service when history is disabled', () => {
    const outlet = new SolaxOutletAccessory(createLog(), createApi(), 'Outlet', 'outlet-1', 'Model', false);

    outlet.setPowerConsumption(42);

    assert.equal(outlet.getPowerConsumptionValue(), 42);
    assert.equal(outlet.getServices().length, 2);
  });

  it('owns and updates its Matter electrical sensor', async () => {
    const matter = createMatterApi();
    const outlet = new SolaxOutletAccessory(
      createLog(),
      createApi(matter.api),
      'Outlet',
      'outlet-1',
      'Model',
      false,
      undefined,
      {
        displayName: 'Outlet sensor',
        serialNumber: 'outlet-light-1',
        supportsEnergy: true,
      },
    );

    assert.equal(matter.registrations.length, 1);

    const accessory = matter.registrations[0][0];
    assert.equal(accessory.displayName, 'Outlet sensor');
    assert.equal(accessory.serialNumber, 'outlet-light-1');
    assert.equal(accessory.deviceType, matter.api.deviceTypes.ElectricalSensor);
    assert.deepEqual(accessory.clusters, {
      electricalPowerMeasurement: { activePower: 0 },
      electricalEnergyMeasurement: {
        cumulativeEnergyExported: { energy: 0 },
      },
    });

    outlet.setPowerConsumption(123.456);
    outlet.setTotalEnergyConsumption(12.345);
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
