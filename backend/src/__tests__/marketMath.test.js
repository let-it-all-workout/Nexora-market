import { describe, expect, it } from 'vitest';
import {
  breadthFromChanges,
  conditionFromAvg,
  firstLastPct,
  listedMove,
  normalizeNgxStockRow,
  rebaseAverageSeries,
  seriesReturn,
  sessionChange,
  sliceDatedSeries,
} from '../utils/marketMath.js';

describe('session and listed moves', () => {
  it('uses provided session percent, then price versus previous close', () => {
    expect(sessionChange({ change_percent: -1.25 })).toBe(-1.25);
    expect(sessionChange({ current_price: 52, previous_close: 50 })).toBeCloseTo(4, 8);
    expect(sessionChange({ current_price: 50 })).toBeNull();
    expect(sessionChange({ change_percent: null, current_price: 52, previous_close: 50 })).toBeCloseTo(4, 8);
  });

  it('does not treat a session move as a 7-day figure', () => {
    const stock = { change_percent: 2.5, current_price: 110, previous_close: 100 };
    expect(listedMove(stock, '1d')).toBe(2.5);
    expect(listedMove(stock, '7d')).toBeNull();
    expect(listedMove({ ...stock, pct_change_7d: -4 }, '7d')).toBe(-4);
  });
});

describe('series returns', () => {
  it('uses first-to-last on a chronological series', () => {
    const series = [
      { date: '2026-08-28', close: 100, marketIndex: 140000 },
      { date: '2026-09-04', close: 103, marketIndex: 141400 },
    ];
    expect(firstLastPct(series)).toBeCloseTo(3, 8);
    expect(seriesReturn(series, 'marketIndex')).toBeCloseTo(1, 8);
  });

  it('returns null when a range has fewer than two valid points', () => {
    expect(firstLastPct([{ date: '2026-09-04', close: 100 }])).toBeNull();
    expect(firstLastPct([])).toBeNull();
    expect(firstLastPct([{ date: '2026-09-01', close: 0 }, { date: '2026-09-04', close: 10 }])).toBeNull();
  });
});

describe('breadth and condition', () => {
  it('counts flats separately instead of as advances', () => {
    const { advances, declines, unchanged, avg } = breadthFromChanges([1.2, 0, -0.4, null, 0.8]);
    expect(advances).toBe(2);
    expect(declines).toBe(1);
    expect(unchanged).toBe(1);
    expect(avg).toBeCloseTo((1.2 + 0 - 0.4 + 0.8) / 4, 8);
  });

  it('applies NGX breadth gate so a lone large move is not automatically bullish', () => {
    expect(conditionFromAvg(0.8, {
      bullThreshold: 0.3,
      bearThreshold: -0.3,
      advances: 2,
      declines: 6,
      requireBreadth: true,
    })).toBe('Neutral');
    expect(conditionFromAvg(0.8, {
      bullThreshold: 0.3,
      bearThreshold: -0.3,
      advances: 6,
      declines: 2,
      requireBreadth: true,
    })).toBe('Bullish');
  });
});

describe('rebased average path', () => {
  it('starts each name at 100 and averages overlapping dates', () => {
    const series = rebaseAverageSeries([
      { series: [{ date: '2026-09-01', close: 50 }, { date: '2026-09-02', close: 55 }] },
      { series: [{ date: '2026-09-01', close: 200 }, { date: '2026-09-02', close: 180 }] },
    ]);
    expect(series[0]).toMatchObject({ date: '2026-09-01', marketIndex: 100 });
    expect(series[1].marketIndex).toBeCloseTo((110 + 90) / 2, 8);
  });
});

describe('NGX snapshot normalize and range slice', () => {
  it('maps Pulse aliases and derives session percent when the feed omits it', () => {
    const row = normalizeNgxStockRow({
      symbol: 'gtco',
      current_price: 52.8,
      previousClose: 51.9,
      marketCap: 1.55e12,
    });
    expect(row.symbol).toBe('GTCO');
    expect(row.previous_close).toBe(51.9);
    expect(row.market_cap).toBe(1.55e12);
    expect(row.change_percent).toBeCloseTo(((52.8 - 51.9) / 51.9) * 100, 8);
    expect(row.pct_change_7d).toBeNull();
  });

  it('keeps only bars inside the requested ASI window', () => {
    const sliced = sliceDatedSeries([
      { date: '2026-08-20', value: 1 },
      { date: '2026-08-31', value: 2 },
      { date: '2026-09-04', value: 3 },
      { date: '2026-09-10', value: 4 },
    ], '2026-08-30', '2026-09-06');
    expect(sliced.map((row) => row.date)).toEqual(['2026-08-31', '2026-09-04']);
  });
});
