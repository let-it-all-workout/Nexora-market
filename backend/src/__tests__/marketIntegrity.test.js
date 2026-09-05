import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import {
  buildMarketMetadata,
  geckoIdFromYahooCryptoSymbol,
  normalizeNgxDividendRows,
  normalizeNgxHistoryRows,
  normalizeNgxIndexRows,
  yahooSymbolForCryptoId,
} from '../services/marketData.js';

describe('verified market data contract', () => {
  it('requires snapshot or historical provenance', () => {
    expect(buildMarketMetadata({
      provider: 'ngx-pulse',
      dataKind: 'historical',
      rangeStart: '2026-08-01',
      rangeEnd: '2026-08-31',
    })).toMatchObject({
      provider: 'ngx-pulse',
      dataKind: 'historical',
      derived: false,
      stale: false,
      fallbackUsed: false,
    });
    expect(() => buildMarketMetadata({ provider: 'ngx-pulse', dataKind: 'estimated' }))
      .toThrow(/valid dataKind/i);
    expect(buildMarketMetadata({
      provider: 'ngx-pulse',
      dataKind: 'snapshot',
      stale: true,
      fallbackUsed: true,
      fallbackReason: 'provider-unavailable',
    })).toMatchObject({
      stale: true,
      fallbackUsed: true,
      fallbackReason: 'provider-unavailable',
    });
  });

  it('normalizes only provider-returned NGX OHLCV rows', () => {
    const sourceRows = [
      {
        symbol: 'DANGCEM',
        trade_date: '2026-08-28',
        open_price: 520,
        high_price: 525,
        low_price: 517,
        close_price: 523,
        volume: 1000,
      },
      {
        symbol: 'DANGCEM',
        trade_date: '2026-08-31',
        open_price: 523,
        high_price: 530,
        low_price: 521,
        close_price: 528,
        volume: 1200,
      },
    ];
    const normalized = normalizeNgxHistoryRows({ data: sourceRows });
    expect(normalized).toHaveLength(sourceRows.length);
    expect(normalized.map((row) => row.date)).toEqual(['2026-08-28', '2026-08-31']);
    expect(normalized.map((row) => row.close)).toEqual([523, 528]);
  });

  it('normalizes official index rows without inventing dates', () => {
    const normalized = normalizeNgxIndexRows({
      data: [
        { date: '2026-08-28', value: 141000.25 },
        { date: '2026-08-31', value: 141250.75 },
      ],
    });
    expect(normalized).toEqual([
      { date: '2026-08-28', value: 141000.25 },
      { date: '2026-08-31', value: 141250.75 },
    ]);
  });

  it('normalizes NGX dividend records and drops rows without a dated payment', () => {
    const normalized = normalizeNgxDividendRows({
      history: [
        {
          ex_dividend_date: '2025-06-10',
          record_date: '2025-06-09',
          pay_date: '2025-06-23',
          dividend_per_share: 30,
          currency: 'NGN',
          source_name: 'StockAnalysis',
          source_url: 'https://example.test/dangcem',
        },
        {
          ex_dividend_date: '2026-06-18',
          record_date: '2026-06-18',
          pay_date: '2026-07-02',
          dividend_per_share: 45,
          currency: 'NGN',
        },
        { ex_dividend_date: 'not-a-date', dividend_per_share: 12 },
        { ex_dividend_date: '2024-04-16', dividend_per_share: null },
      ],
    });

    expect(normalized).toHaveLength(2);
    expect(normalized.map((row) => row.exDate)).toEqual(['2026-06-18', '2025-06-10']);
    expect(normalized[0]).toMatchObject({ perShare: 45, payDate: '2026-07-02', currency: 'NGN' });
    expect(normalized[1].sourceName).toBe('StockAnalysis');
  });

  it('rejects NGX company lookups that are not tickers', async () => {
    const response = await request(createApp()).get('/api/ngx/company/not a ticker!');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_SYMBOL');
  });

  it('rejects malformed NGX history ranges before calling a provider', async () => {
    const response = await request(createApp())
      .get('/api/ngx/history/DANGCEM?from=2026-08-31&to=2026-08-01');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_RANGE');
  });

  it('maps CoinGecko ids and tickers to Yahoo crypto symbols without inventing names', () => {
    expect(yahooSymbolForCryptoId('bitcoin')).toBe('BTC-USD');
    expect(yahooSymbolForCryptoId('cardano')).toBe('ADA-USD');
    expect(yahooSymbolForCryptoId('avalanche-2')).toBe('AVAX-USD');
    expect(yahooSymbolForCryptoId('unknown-gecko-id', 'ada')).toBe('ADA-USD');
    expect(yahooSymbolForCryptoId('sui')).toBe('SUI-USD');
    expect(yahooSymbolForCryptoId('cardano-something-long')).toBeNull();
    expect(geckoIdFromYahooCryptoSymbol('ADA-USD')).toBe('cardano');
    expect(geckoIdFromYahooCryptoSymbol('BTC-USD')).toBe('bitcoin');
  });
});
