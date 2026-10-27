import assert from 'assert';

import { SolaxPlatformAccessory } from '../src/platformAccessory.js';
import { createApi, createLog } from './helpers.js';

describe('SolaxPlatformAccessory', () => {
  it('exposes normalized model and stable hashed serial information', () => {
    const accessory = new SolaxPlatformAccessory(createLog(), createApi(), 'Base accessory', 'serial-1', 'Model / 1!');

    assert.equal(accessory.getModel(), 'Model  1');
    assert.notEqual(accessory.getSerial(), 'serial-1');
    assert.equal(accessory.getServices().length, 1);
  });

  it('updates model and serial characteristics', () => {
    const accessory = new SolaxPlatformAccessory(createLog(), createApi(), 'Base accessory', 'serial-1', 'Model');

    accessory.setModel('Updated Model');
    accessory.setSerial('updated-serial');

    assert.equal(accessory.getModel(), 'Updated Model');
    assert.equal(accessory.getSerial(), 'updated-serial');
  });
});
