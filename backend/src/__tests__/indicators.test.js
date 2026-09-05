import { describe, expect, it } from 'vitest';
import { detectAnomalies } from '../utils/anomaly.js';
import {
  emaSeries,
  enrichIndicators,
  rsiSeries,
  smaSeries,
} from '../utils/normalize.js';

describe('moving averages and RSI', () => {
  it('computes SMA only after the window is full', () => {
    const closes = [1, 2, 3, 4, 5];
    expect(smaSeries(closes, 3)).toEqual([null, null, 2, 3, 4]);
  });

  it('seeds EMA from the SMA of the first window', () => {
    const closes = [10, 11, 12, 13, 14];
    const ema = emaSeries(closes, 3);
    expect(ema[0]).toBeNull();
    expect(ema[1]).toBeNull();
    expect(ema[2]).toBeCloseTo(11, 8);
    expect(ema[3]).toBeCloseTo(13 * 0.5 + 11 * 0.5, 8);
  });

  it('returns 100 RSI on a strictly rising series after the window', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 10 + i);
    const rsi = rsiSeries(closes, 14);
    expect(rsi[14]).toBe(100);
    expect(rsi[19]).toBe(100);
  });
});

describe('anomaly detection', () => {
  function calmSeriesWithSpike() {
    const series = [];
    let close = 100;
    for (let i = 0; i < 180; i += 1) {
      const shock = i === 120 ? -0.18 : ((i % 7) - 3) * 0.001;
      close = close * (1 + shock);
      series.push({
        date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
        close,
        high: close * 1.002,
        low: close * 0.998,
        volume: i === 120 ? 50_000 : 1000 + (i % 5) * 10,
      });
    }
    return series;
  }

  it('flags the injected crash with both Isolation Forest and 3-sigma', () => {
    const flags = detectAnomalies(calmSeriesWithSpike(), { seed: 7, nTrees: 40 });
    expect(flags[120].anomalySigma).toBe(true);
    expect(flags[120].anomalyMl).toBe(true);
    const sigmaCount = flags.filter((row) => row.anomalySigma).length;
    const mlCount = flags.filter((row) => row.anomalyMl).length;
    expect(sigmaCount).toBeGreaterThanOrEqual(1);
    expect(mlCount).toBeGreaterThanOrEqual(1);
    expect(mlCount).toBeLessThan(flags.length / 5);
    expect(flags[120].anomalyReasons).toEqual(expect.arrayContaining(['dump', 'volume']));
    expect(flags[120].sigmaPrice).toBe(true);
    expect(flags[120].sigmaVolume).toBe(true);
    expect(flags[120].returnPct).toBeCloseTo(-18, 0);
    expect(flags[120].volumeRatio).toBeGreaterThan(10);
    expect(Math.abs(flags[120].returnZ)).toBeGreaterThan(3);
    expect(Math.abs(flags[120].volumeZ)).toBeGreaterThan(3);
  });

  it('labels a jump as a spike rather than a dump', () => {
    const series = [];
    let close = 100;
    for (let i = 0; i < 80; i += 1) {
      close = close * (1 + ((i % 7) - 3) * 0.001);
      series.push({
        date: `2024-03-${String((i % 28) + 1).padStart(2, '0')}`,
        close: i === 50 ? close * 1.22 : close,
        high: close * 1.002,
        low: close * 0.998,
        volume: 1000,
      });
      if (i === 50) close *= 1.22;
    }
    const flags = detectAnomalies(series, { seed: 3, nTrees: 40 });
    expect(flags[50].anomalyReasons).toContain('spike');
    expect(flags[50].anomalyReasons).not.toContain('dump');
    expect(flags[50].sigmaPrice).toBe(true);
    expect(flags[50].sigmaVolume).toBe(false);
    expect(flags[50].returnPct).toBeGreaterThan(10);
  });

  it('flags a volume spike without calling it a price spike', () => {
    const series = Array.from({ length: 60 }, (_, i) => ({
      date: `2024-04-${String((i % 28) + 1).padStart(2, '0')}`,
      close: 100 + ((i % 5) - 2) * 0.05,
      high: 100.2,
      low: 99.8,
      volume: i === 40 ? 80_000 : 1000,
    }));
    const flags = detectAnomalies(series, { seed: 3, nTrees: 40 });
    expect(flags[40].sigmaVolume).toBe(true);
    expect(flags[40].sigmaPrice).toBe(false);
    expect(flags[40].anomalyReasons).toContain('volume');
    expect(flags[40].anomalyReasons).not.toContain('spike');
    expect(flags[40].anomalyReasons).not.toContain('dump');
  });

  it('attaches indicator and anomaly fields on enrich', () => {
    const series = Array.from({ length: 40 }, (_, i) => ({
      date: `2024-02-${String(i + 1).padStart(2, '0')}`,
      close: 50 + i,
      high: 51 + i,
      low: 49 + i,
      volume: 1000,
    }));
    const enriched = enrichIndicators(series);
    expect(enriched[19].sma20).toBeCloseTo(
      series.slice(0, 20).reduce((sum, row) => sum + row.close, 0) / 20,
      8,
    );
    expect(enriched[0].sma20).toBeNull();
    expect(enriched.at(-1)).toHaveProperty('anomalyMl');
    expect(enriched.at(-1)).toHaveProperty('rsi14');
  });
});
