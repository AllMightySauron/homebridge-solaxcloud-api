import { Statistics } from '../src/statistics.js';

import assert from 'assert';

describe('Statistics: Smoothing methods', () => {
  const sampleSeries = [1, 3, 5, 3, 7, 6, 8, 5, 8, 8, 4, 5];

  it('Simple Moving Average (sanity checks)', () => {
    // window size too big
    assert.deepEqual(Statistics.simpleMovingAverage(sampleSeries, 100), []);
  });

  it('Simple Moving Average', () => {
    assert.deepEqual(
      Statistics.simpleMovingAverage(sampleSeries, 4),
      [
        3,
        4.5,
        5.25,
        6,
        6.5,
        6.75,
        7.25,
        6.25,
        6.25],
    );
  });

  it('Exponential Moving Average (sanity checks)', () => {
    // window size too big
    assert.deepEqual(Statistics.exponentialMovingAverage(sampleSeries, 100), []);
  });

  it('Exponential Moving Average', () => {
    assert.deepEqual(
      Statistics.exponentialMovingAverage(sampleSeries, 4),
      [
        3,
        4.6,
        5.16,
        6.296,
        5.7776000000000005,
        6.6665600000000005,
        7.199936,
        5.9199616,
        5.55197696,
      ],
    );
  });

});