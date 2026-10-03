import { describe, expect, it } from 'vitest';
import {
  Z_10_90,
  logReturns,
  parseOutlookYears,
  projectOutlook,
  sampleStats,
} from '../utils/forecast.js';

function risingSeries(days, start = 100, dailyLog = 0.001) {
  return Array.from({ length: days }, (_, i) => ({
    date: `2016-01-${String((i % 28) + 1).padStart(2, '0')}`,
    close: start * Math.exp(dailyLog * i),
  })).map((row, i) => ({
    ...row,
    date: new Date(Date.UTC(2016, 0, 1 + i)).toISOString().slice(0, 10),
  }));
}

describe('outlook math', () => {
  it('only accepts 1, 2, 3, or 5 year horizons', () => {
    expect(parseOutlookYears('3')).toBe(3);
    expect(parseOutlookYears(4)).toBeNull();
    expect(parseOutlookYears('9')).toBeNull();
  });

  it('computes log returns and sample stats', () => {
    expect(logReturns([100, 110, 121])).toEqual([
      Math.log(1.1),
      Math.log(1.1),
    ]);
    const { mean, std, n } = sampleStats([1, 3, 5]);
    expect(n).toBe(3);
    expect(mean).toBe(3);
    expect(std).toBeCloseTo(Math.sqrt(4), 8);
  });

  it('projects a noiseless rise to last × exp(μT)', () => {
    const mu = 0.001;
    const series = risingSeries(400, 100, mu);
    const last = series.at(-1).close;
    const out = projectOutlook(series, { horizonYears: 1, periodsPerYear: 252, minBars: 252 });
    expect(out.ok).toBe(true);
    expect(out.typical).toBeCloseTo(last * Math.exp(mu * 252), 6);
    expect(out.weaker).toBeCloseTo(out.typical, 4);
    expect(out.stronger).toBeCloseTo(out.typical, 4);
    expect(out.typicalPct).toBeCloseTo(((out.typical - last) / last) * 100, 6);
  });

  it('widens weaker and stronger when volatility is present', () => {
    const series = risingSeries(400, 100, 0);
    series.forEach((row, i) => {
      row.close = 100 * (i % 2 === 0 ? 1.02 : 0.98);
    });
    const out = projectOutlook(series, { horizonYears: 3, minBars: 252 });
    expect(out.ok).toBe(true);
    expect(out.weaker).toBeLessThan(out.typical);
    expect(out.stronger).toBeGreaterThan(out.typical);
    const last = series.at(-1).close;
    const band = out.dailyVol * Math.sqrt(3 * 252) * Z_10_90;
    expect(out.weaker).toBeCloseTo(last * Math.exp(out.dailyMean * 3 * 252 - band), 6);
  });

  it('refuses a series shorter than one year of daily bars', () => {
    const out = projectOutlook(risingSeries(80), { horizonYears: 3 });
    expect(out.ok).toBe(false);
    expect(out.code).toBe('INSUFFICIENT_HISTORY');
    expect(out.barCount).toBe(80);
  });
});
