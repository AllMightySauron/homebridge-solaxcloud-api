import { Logging, PlatformConfig } from 'homebridge';

import assert from 'assert';

import { SolaxCloudAPIPlatform } from '../src/platform.js';

interface TestLog extends Logging {
  errors: string[];
}

function createLog(): TestLog {
  const noop = () => undefined;
  const log = Object.assign(noop, {
    debug: noop,
    info: noop,
    warn: noop,
    log: noop,
    prefix: '',
    errors: [] as string[],
    error(message: string) {
      this.errors.push(message);
    },
  }) as unknown as TestLog;

  return log;
}

function createConfig(pollingFrequency = 300): PlatformConfig {
  return {
    platform: 'SolaxCloudAPI',
    inverters: [
      {
        brand: 'solax',
        tokenId: '20200722185111234567890',
        name: 'Test inverter',
        sn: 'ABCDEFGHIJ',
      },
    ],
    pollingFrequency,
  };
}

function createPlatformForConfigCheck(log: Logging): SolaxCloudAPIPlatform {
  const platform = Object.create(SolaxCloudAPIPlatform.prototype);

  platform.log = log;

  return platform as SolaxCloudAPIPlatform;
}

describe('SolaxCloudAPIPlatform config checks', () => {
  [
    {
      name: 'missing inverters',
      config: { platform: 'SolaxCloudAPI' } as PlatformConfig,
      error: 'mandatory parameter "inverters"',
    },
    {
      name: 'non-array inverters',
      config: { ...createConfig(), inverters: 'invalid' },
      error: 'Incorrect type for mandatory parameter "inverters"',
    },
    {
      name: 'inverter missing mandatory fields',
      config: { ...createConfig(), inverters: [{ brand: 'solax', name: 'Test inverter', sn: 'ABCDEFGHIJ' }] },
      error: 'Invalid type for inverter under "inverters"',
    },
    {
      name: 'null inverter entry',
      config: { ...createConfig(), inverters: [null] },
      error: 'Invalid type for inverter under "inverters"',
    },
    {
      name: 'unsupported inverter brand',
      config: {
        ...createConfig(),
        inverters: [
          {
            brand: 'unsupported',
            tokenId: '20200722185111234567890',
            name: 'Test inverter',
            sn: 'ABCDEFGHIJ',
          },
        ],
      },
      error: 'Invalid type for inverter under "inverters"',
    },
    {
      name: 'duplicate inverter names',
      config: {
        ...createConfig(),
        inverters: [
          {
            brand: 'solax',
            tokenId: '20200722185111234567890',
            name: 'Test inverter',
            sn: 'ABCDEFGHIJ',
          },
          {
            brand: 'qcells',
            tokenId: '20200722185111234567891',
            name: 'Test inverter',
            sn: 'KLMNOPQRST',
          },
        ],
      },
      error: 'Duplicate inverter names',
    },
    {
      name: 'duplicate inverter serial numbers',
      config: {
        ...createConfig(),
        inverters: [
          {
            brand: 'solax',
            tokenId: '20200722185111234567890',
            name: 'Test inverter 1',
            sn: 'ABCDEFGHIJ',
          },
          {
            brand: 'qcells',
            tokenId: '20200722185111234567891',
            name: 'Test inverter 2',
            sn: 'ABCDEFGHIJ',
          },
        ],
      },
      error: 'Duplicate inverter SNs',
    },
  ].forEach(testCase => {
    it(`rejects invalid config: ${testCase.name}`, () => {
      const log = createLog();
      const platform = createPlatformForConfigCheck(log);

      assert.equal(platform['checkConfig'](testCase.config as PlatformConfig), false);
      assert.equal(log.errors.length, 1);
      assert.match(log.errors[0], new RegExp(testCase.error));
    });
  });

  it('rejects polling frequencies that would produce an empty smoothing window', () => {
    const log = createLog();
    const platform = createPlatformForConfigCheck(log);
    const config = createConfig(901);

    assert.throws(
      () => platform['checkConfig'](config),
      /Polling frequency cannot be higher than 900 seconds/,
    );
    assert.equal(log.errors.length, 1);
  });

  it('accepts the largest polling frequency that keeps one smoothing period', () => {
    const log = createLog();
    const platform = createPlatformForConfigCheck(log);
    const config = createConfig(900);

    assert.equal(platform['checkConfig'](config), true);
    assert.equal(config.pollingFrequency, 900);
  });

  it('defaults history to enabled when not configured', () => {
    const log = createLog();
    const platform = createPlatformForConfigCheck(log);
    const config = createConfig();

    assert.equal(platform['checkConfig'](config), true);
    assert.equal(config.enableHistory, true);
  });

  it('keeps history disabled when configured', () => {
    const log = createLog();
    const platform = createPlatformForConfigCheck(log);
    const config = { ...createConfig(), enableHistory: false };

    assert.equal(platform['checkConfig'](config), true);
    assert.equal(config.enableHistory, false);
  });

  it('defaults invalid history config to enabled', () => {
    const log = createLog();
    const platform = createPlatformForConfigCheck(log);
    const config = { ...createConfig(), enableHistory: 'invalid' };

    assert.equal(platform['checkConfig'](config), true);
    assert.equal(config.enableHistory, true);
  });
});
