import { API, Logging, MatterAccessory, MatterAPI } from 'homebridge';
import { Characteristic, Service, uuid } from '@homebridge/hap-nodejs';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const { CharacteristicEventTypes, Formats, Perms } = require('@homebridge/hap-nodejs');

export interface MatterApiHarness {
  api: MatterAPI;
  registrations: MatterAccessory[][];
  updates: Array<{
    uuid: string;
    cluster: string;
    attributes: Record<string, unknown>;
  }>;
}

export function createLog(): Logging {
  const noop = () => undefined;

  return Object.assign(noop, {
    debug: noop,
    error: noop,
    info: noop,
    warn: noop,
    log: noop,
    prefix: '',
  }) as unknown as Logging;
}

export function createApi(matter?: MatterAPI): API {
  return {
    hap: {
      Characteristic,
      CharacteristicEventTypes,
      Formats,
      Perms,
      Service,
      uuid,
    },
    on: () => undefined,
    user: {
      storagePath: () => path.join(os.tmpdir(), 'homebridge-solaxcloud-api-test'),
    },
    matter,
  } as unknown as API;
}

export function createMatterApi(): MatterApiHarness {
  const registrations: MatterAccessory[][] = [];
  const updates: MatterApiHarness['updates'] = [];

  const api = {
    deviceTypes: {
      ElectricalSensor: { name: 'ElectricalSensor' },
    },
    clusterNames: {
      ElectricalPowerMeasurement: 'electricalPowerMeasurement',
      ElectricalEnergyMeasurement: 'electricalEnergyMeasurement',
    },
    registerPlatformAccessories: async (
      _pluginIdentifier: string,
      _platformName: string,
      accessories: MatterAccessory[],
    ) => {
      registrations.push(accessories);
    },
    updateAccessoryState: async (
      uuid: string,
      cluster: string,
      attributes: Record<string, unknown>,
    ) => {
      updates.push({ uuid, cluster, attributes });
    },
  } as unknown as MatterAPI;

  return { api, registrations, updates };
}
