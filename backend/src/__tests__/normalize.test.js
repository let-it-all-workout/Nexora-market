import { describe, expect, it } from 'vitest';
import { normalizeCryptoSeries, normalizeStockSeries } from '../utils/normalize.js';

describe('market series normalization', () => {
  it('preserves distinct intraday timestamps for stock charts', () => {
    const start = Date.UTC(2026, 7, 31, 13, 30) / 1000;
    const raw = {
      chart: {
        result: [{
          meta: { currency: 'USD' },
          timestamp: [start, start + 300, start + 600],
          indicators: {
            quote: [{
              close: [100, 101, 102],
              open: [99, 100, 101],
              high: [101, 102, 103],
              low: [98, 99, 100],
              volume: [10, 20, 30],
            }],
          },
        }],
      },
    };
    const { series } = normalizeStockSeries(raw, 'TEST');
    expect(new Set(series.map((point) => point.date)).size).toBe(3);
    expect(series[0].date).toContain('T');
  });

  it('keeps daily crypto labels date-only', () => {
    const start = Date.UTC(2026, 7, 1);
    const { series } = normalizeCryptoSeries({
      prices: [[start, 10], [start + 86400000, 11]],
      total_volumes: [[start, 100], [start + 86400000, 110]],
    }, 'coin');
    expect(series.map((point) => point.date)).toEqual(['2026-08-01', '2026-08-02']);
  });
});
