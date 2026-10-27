import assert from 'assert';
import { SolaxOutletAccessory } from '../src/outletAccessory.js';
import { createApi, createLog } from './helpers.js';

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
});
