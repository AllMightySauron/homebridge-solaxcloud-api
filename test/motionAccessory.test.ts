import assert from 'assert';

import { SolaxMotionAccessory } from '../src/motionAccessory.js';
import { createApi, createLog } from './helpers.js';

function sleep(millis: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, millis));
}

describe('SolaxMotionAccessory', () => {
  it('stores motion state and clears it after the configured timeout', async () => {
    const motion = new SolaxMotionAccessory(createLog(), createApi(), 'Motion', 'motion-1', 'Model');

    motion.setMotionTimeout(0);
    assert.equal(motion.getMotionTimeout(), 0);

    motion.setState(true);
    motion.getState((error, value) => {
      assert.equal(error, null);
      assert.equal(value, true);
    });

    await sleep(5);

    motion.getState((error, value) => {
      assert.equal(error, null);
      assert.equal(value, false);
    });
  });

  it('exposes information and motion services', () => {
    const motion = new SolaxMotionAccessory(createLog(), createApi(), 'Motion', 'motion-1', 'Model');

    assert.equal(motion.getServices().length, 2);
  });
});
