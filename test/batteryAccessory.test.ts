import assert from 'assert';

import { BATTERY_CHARGING_STATE, SolaxBatteryAccessory } from '../src/batteryAccessory.js';
import { createApi, createLog } from './helpers.js';

describe('SolaxBatteryAccessory', () => {
  it('keeps charge state getter in sync after updates', () => {
    const battery = new SolaxBatteryAccessory(createLog(), createApi(), 'Battery', 'bat-test', 'Test Model');

    battery.setChargeState(BATTERY_CHARGING_STATE.CHARGING);
    assert.equal(battery.getChargeStateValue(), BATTERY_CHARGING_STATE.CHARGING);

    battery.setChargeState(BATTERY_CHARGING_STATE.NOT_CHARGEABLE);
    assert.equal(battery.getChargeStateValue(), BATTERY_CHARGING_STATE.NOT_CHARGEABLE);
  });
});
