import { describe, expect, it } from 'vitest';
import {
  assessLiquidity,
  plausibleFloat,
  quoteSpread,
  scoreLiquidityBoard,
  sessionAverages,
} from '../utils/liquidity.js';

describe('liquidity scoring', () => {
  it('ignores a bogus tiny float versus shares outstanding', () => {
    expect(plausibleFloat(1_233_781, 1_408_035_161)).toBeNull();
    expect(plausibleFloat(14_569_078_010, 14_594_180_000)).toBeCloseTo(14_569_078_010);
  });

  it('keeps a liquid large-cap easy to sell', () => {
    const out = assessLiquidity({
      venue: 'us',
      volume: 46_000_000,
      averageVolume: 46_000_000,
      sharesOutstanding: 14_594_180_000,
      floatShares: 14_569_078_010,
      insiderPct: 0.016,
      price: 334,
      marketCap: 4.88e12,
    });
    expect(out.tone).toBe('ok');
    expect(out.label).toBe('Easy to sell');
    expect(out.flags).toEqual([]);
    expect(out.lead.toLowerCase()).toContain('straightforward');
  });

  it('does not call a liquid stock unsellable just because the opening print is still zero', () => {
    const out = assessLiquidity({
      venue: 'us',
      volume: 0,
      averageVolume: 46_000_000,
      sharesOutstanding: 14_594_180_000,
      price: 334,
      marketCap: 4.88e12,
    });
    expect(out.tone).toBe('ok');
    expect(out.metrics.usedTypical).toBe(true);
  });

  it('flags insider control at 80% as hard to sell, in plain words', () => {
    const out = assessLiquidity({
      venue: 'us',
      volume: 2_000_000,
      averageVolume: 2_000_000,
      sharesOutstanding: 500_000_000,
      floatShares: 400_000_000,
      insiderPct: 0.82,
      price: 20,
      marketCap: 10e9,
    });
    expect(out.tone).toBe('red');
    expect(out.label).toBe('Hard to sell');
    expect(out.flags.some((flag) => flag.code === 'INSIDER_CONTROL')).toBe(true);
    expect(out.lead).toContain('82%');
    expect(out.lead.toLowerCase()).toContain('not up for sale');
  });

  it('keeps missing insider figures blank instead of 0%', () => {
    const out = assessLiquidity({
      venue: 'ngx',
      volume: 13_602,
      sharesOutstanding: 7_500_000_000,
      price: 178,
      marketCap: 1_335_000_000_000,
    });
    expect(out.metrics.insiderPct).toBeNull();
    expect(out.metrics.closelyHeldPct).toBeNull();
  });

  it('explains a Transcorp Power-style listing as hard to sell without scientific notation', () => {
    const out = assessLiquidity({
      venue: 'ngx',
      symbol: 'TRANSPOWER',
      volume: 13_602,
      sharesOutstanding: 7_500_000_000,
      price: 178,
      marketCap: 1_335_000_000_000,
    });
    expect(out.tone).toBe('red');
    expect(out.label).toBe('Hard to sell');
    expect(out.tableLine).toMatch(/₦500,000/);
    expect(out.lead).toMatch(/₦2\.4 million/);
    expect(`${out.lead} ${out.notes.join(' ')}`).toMatch(/does not say who/);
    expect(`${out.lead} ${out.notes.join(' ')}`).not.toMatch(/e-|turnover|prints|float/i);
    expect(out.metrics.turnover).toBeCloseTo(13_602 / 7_500_000_000, 12);
  });

  it('flags a zero-print session as hard to sell', () => {
    const out = assessLiquidity({ venue: 'ngx', volume: 0, sharesOutstanding: 1e9, marketCap: 50e9, price: 50 });
    expect(out.tone).toBe('red');
    expect(out.flags[0].code).toBe('NO_PRINTS');
    expect(out.lead.toLowerCase()).toContain('nothing');
  });

  it('does not blame one name when the whole board shows zero trading', () => {
    const out = assessLiquidity({
      venue: 'ngx',
      volume: 0,
      sharesOutstanding: 1e9,
      price: 10,
      marketCap: 10e9,
    }, {
      venue: 'ngx',
      peerVolumes: Array.from({ length: 12 }, () => 0),
    });
    expect(out.tone).toBe('unknown');
    expect(out.flags[0].code).toBe('QUIET_BOARD');
    expect(out.lead.toLowerCase()).toContain('closed');
  });

  it('sorts a board with hard-to-sell names first', () => {
    const board = scoreLiquidityBoard([
      { symbol: 'GTCO', venue: 'ngx', volume: 5_000_000, sharesOutstanding: 2e10, price: 80, marketCap: 1.6e12 },
      { symbol: 'TRANSPOWER', venue: 'ngx', volume: 13_602, sharesOutstanding: 7.5e9, price: 178, marketCap: 1.335e12 },
      { symbol: 'DRY', venue: 'ngx', volume: 0, sharesOutstanding: 1e9, price: 10, marketCap: 10e9 },
    ], 'ngx');
    expect(board[0].tone).toBe('red');
    expect(board.find((row) => row.symbol === 'TRANSPOWER').label).toBe('Hard to sell');
    expect(board.find((row) => row.symbol === 'GTCO').tone).toBe('ok');
    expect(board.find((row) => row.symbol === 'TRANSPOWER').tableLine).not.toMatch(/e-/);
  });

  it('flags a crypto name when a normal sale is a large part of the day', () => {
    const out = assessLiquidity({
      venue: 'crypto',
      valueTraded: 3_000,
      volume: 3_000,
      marketCap: 80_000_000,
      price: 0.02,
    });
    expect(out.tone).toBe('red');
    expect(out.lead).toMatch(/\$1,000/);
    expect(out.tableLine.toLowerCase()).toContain('third');
  });

  it('keeps a busy coin easy to sell', () => {
    const out = assessLiquidity({
      venue: 'crypto',
      valueTraded: 20_000_000_000,
      volume: 20_000_000_000,
      marketCap: 400_000_000_000,
      price: 20_000,
    });
    expect(out.tone).toBe('ok');
    expect(out.label).toBe('Easy to sell');
  });

  it('keeps Dangote Cement easy to sell when a normal sale is a tiny slice of a busy naira day', () => {
    const out = assessLiquidity({
      venue: 'ngx',
      symbol: 'DANGCEM',
      volume: 163_542,
      sharesOutstanding: 16_873_559_251,
      price: 1066.7,
      marketCap: 17_999_025_653_041.7,
    }, {
      venue: 'ngx',
      peerTurnovers: Array.from({ length: 20 }, (_, index) => 0.00002 + index * 0.00001),
      peerCaps: Array.from({ length: 20 }, () => 40_000_000_000),
    });
    expect(out.saleShare).toBeLessThan(0.01);
    expect(out.tone).toBe('ok');
    expect(out.label).toBe('Easy to sell');
    expect(out.flags.map((flag) => flag.code)).toContain('LARGE_THIN');
    expect(out.flags.find((flag) => flag.code === 'LARGE_THIN').severity).toBe('info');
    expect(out.lead.toLowerCase()).not.toContain('owner');
  });

  it('does not mark a smaller name slow when the day already covers a normal sale', () => {
    const out = assessLiquidity({
      venue: 'ngx',
      symbol: 'ETI',
      volume: 1_000_000,
      sharesOutstanding: 2_000_000_000,
      price: 40,
      marketCap: 80_000_000_000,
    }, {
      venue: 'ngx',
      peerTurnovers: Array.from({ length: 20 }, () => 0.01),
      peerCaps: Array.from({ length: 20 }, () => 500_000_000_000),
    });
    expect(out.saleShare).toBeLessThan(0.025);
    expect(out.tone).toBe('ok');
    expect(out.label).toBe('Easy to sell');
    expect(out.flags.find((flag) => flag.code === 'BELOW_PEERS')?.severity).toBe('info');
  });

  it('does not invent free float, a bid-ask, or a market maker when NGX does not publish them', () => {
    const out = assessLiquidity({
      venue: 'ngx',
      symbol: 'DANGCEM',
      volume: 163_542,
      sharesOutstanding: 16_873_559_251,
      price: 1066.7,
      marketCap: 17_999_025_653_041.7,
    });
    expect(out.tone).toBe('ok');
    expect(out.reason).toBe('Demand is there');
    expect(out.factors.find((factor) => factor.cause)?.key).toBe('demand');
    expect(out.factors.find((factor) => factor.key === 'float').value).toBe('Not published');
    expect(out.factors.find((factor) => factor.key === 'spread').value).toBe('Not published');
    expect(out.factors.find((factor) => factor.key === 'listing').value).toBe('Not published');
    expect(out.factors.map((factor) => factor.key)).toEqual([
      'float', 'demand', 'spread', 'listing', 'action', 'settlement', 'hours',
    ]);
  });

  it('marks a busy day hard to sell when the usual day is thin', () => {
    const out = assessLiquidity({
      venue: 'ngx',
      volume: 200_000,
      price: 1000,
      sharesOutstanding: 1_000_000_000,
      marketCap: 1_000_000_000_000,
      averageValue: 2_000_000,
      averageSessions: 7,
    });
    expect(out.saleShare).toBeLessThan(0.01);
    expect(out.tone).toBe('red');
    expect(out.flags.some((flag) => flag.code === 'THIN_AVERAGE')).toBe(true);
    expect(out.tableLine).toMatch(/typical day/);
  });

  it('flags a wide bid-ask and ignores a broken quote', () => {
    const wide = assessLiquidity({
      venue: 'us',
      volume: 1_000_000,
      averageVolume: 1_000_000,
      price: 20,
      sharesOutstanding: 500_000_000,
      marketCap: 10_000_000_000,
      bid: 19,
      ask: 21,
    });
    expect(wide.tone).toBe('red');
    expect(wide.flags.some((flag) => flag.code === 'WIDE_SPREAD')).toBe(true);

    const broken = assessLiquidity({
      venue: 'us',
      volume: 1_000_000,
      averageVolume: 1_000_000,
      price: 20,
      sharesOutstanding: 500_000_000,
      bid: 1,
      ask: 40,
    });
    expect(quoteSpread(1, 40)).toBeNull();
    expect(broken.flags.some((flag) => flag.code === 'WIDE_SPREAD')).toBe(false);
    expect(broken.tone).toBe('ok');
  });

  it('averages only a real run of sessions', () => {
    expect(sessionAverages([
      { close: 10, volume: 100 },
      { close: 10, volume: 300 },
    ])).toBeNull();
    const avg = sessionAverages([
      { close: 10, volume: 0 },
      { close: 10, volume: 100 },
      { close: 12, volume: 200 },
    ]);
    expect(avg.averageSessions).toBe(3);
    expect(avg.averageValue).toBeCloseTo((0 + 1000 + 2400) / 3);
  });

  it('names the factor that made the sale hard', () => {
    const thin = assessLiquidity({
      venue: 'ngx',
      volume: 13_602,
      sharesOutstanding: 7_500_000_000,
      price: 178,
      marketCap: 1_335_000_000_000,
    });
    expect(thin.reason).toBe('Very low demand');
    expect(thin.factors.find((factor) => factor.cause)?.key).toBe('demand');

    const locked = assessLiquidity({
      venue: 'us',
      volume: 2_000_000,
      averageVolume: 2_000_000,
      sharesOutstanding: 500_000_000,
      floatShares: 80_000_000,
      price: 20,
      marketCap: 10e9,
    });
    expect(locked.reason).toBe('Low free float');

    const halted = assessLiquidity({
      venue: 'ngx',
      listingStatus: 'suspended',
      volume: 5_000_000,
      price: 80,
      sharesOutstanding: 2e10,
      marketCap: 1.6e12,
    });
    expect(halted.tone).toBe('red');
    expect(halted.reason).toBe('Suspended');
    expect(halted.label).toBe('Hard to sell');
  });

  it('keeps a closed market from turning a busy name hard to sell', () => {
    const out = assessLiquidity({
      venue: 'ngx',
      volume: 163_542,
      sharesOutstanding: 16_873_559_251,
      price: 1066.7,
      marketCap: 17_999_025_653_041.7,
    }, { marketOpen: false });
    expect(out.tone).toBe('ok');
    expect(out.reason).toBe('Demand is there');
    expect(out.marketClosed).toBe(true);
    expect(out.factors.find((factor) => factor.key === 'hours').value).toBe('Closed');
    expect(out.factors.find((factor) => factor.key === 'settlement').value).toBe('Two trading days');
  });
});
