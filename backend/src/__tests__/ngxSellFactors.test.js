import { describe, expect, it } from 'vitest';
import {
  applySellFactors,
  classifyNotice,
  noticesFromDisclosures,
  quotesBySymbol,
} from '../services/ngxSellFactors.js';

const stocks = [
  { symbol: 'STERLINGNG', name: 'Sterling Financial Holdings Company Plc', shares_outstanding: 1e9 },
  { symbol: 'DANGCEM', name: 'Dangote Cement Plc', shares_outstanding: 16e9 },
  { symbol: 'SEPLAT', name: 'Seplat Energy Plc', shares_outstanding: 6e8 },
  { symbol: 'FIRSTHOLDCO', name: 'First HoldCo Plc', shares_outstanding: 3e10 },
];

describe('ngx sell factor sources', () => {
  it('tells a halt from a lift and ignores a plain dividend', () => {
    expect(classifyNotice('Full suspension in trading of shares')).toBe('suspended');
    expect(classifyNotice('The suspension has been lifted')).toBe('lift');
    expect(classifyNotice('Proposed dividend of ₦2.00')).toBeNull();
    expect(classifyNotice('Rights issue of 1 for 5')).toBe('action');
    expect(classifyNotice('Application for voluntary delisting')).toBe('delisted');
  });

  it('keeps the latest halt and lets a later lift clear it', () => {
    const notices = noticesFromDisclosures([
      {
        title: 'Suspension of trading in the shares of Sterling Financial Holdings Company Plc',
        published_at: '2026-09-01',
      },
      {
        title: 'Lifting of the suspension of trading in Sterling Financial Holdings Company Plc',
        published_at: '2026-09-20',
      },
    ]);
    const [row] = applySellFactors(stocks, { notices });
    expect(row.symbol).toBe('STERLINGNG');
    expect(row.listing_status == null).toBe(true);
  });

  it('marks a suspension that has not been lifted, and a rights issue beside it', () => {
    const notices = noticesFromDisclosures([
      {
        symbol: 'DANGCEM',
        title: 'Rights issue of 1 for 5',
        published_at: '2026-08-01',
      },
      {
        title: 'Trading in the shares of Sterling Financial Holdings Company Plc was suspended',
        published_at: '2026-09-23',
      },
    ]);
    const rows = applySellFactors(stocks, { notices });
    const sterling = rows.find((row) => row.symbol === 'STERLINGNG');
    const dangote = rows.find((row) => row.symbol === 'DANGCEM');
    expect(sterling.listing_status).toBe('suspended');
    expect(dangote.corporate_action).toBe(true);
    expect(dangote.corporate_action_note).toMatch(/Rights issue/);
  });

  it('lets a local file supply free float and correct a halt', () => {
    const rows = applySellFactors(stocks, {
      notices: noticesFromDisclosures([
        {
          title: 'Trading in the shares of Sterling Financial Holdings Company Plc was suspended',
          published_at: '2026-09-23',
        },
      ]),
      local: {
        floats: { DANGCEM: { floatShares: 2_000_000_000, asOf: '2025-12-31', source: 'FY2025 accounts' } },
        listing: { STERLINGNG: { status: 'lifted', source: 'Later bulletin' } },
        actions: {},
        admission: {
          DANGCEM: { method: 'introduction', source: 'Listing memorandum' },
          SEPLAT: { method: 'public-offer' },
          FIRSTHOLDCO: { method: 'scheme', asOf: '2012-11-26', source: '2012 scheme of arrangement' },
        },
      },
      quotes: quotesBySymbol([{ symbol: 'DANGCEM', bid: 1000, ask: 1010 }]),
    });
    const dangote = rows.find((row) => row.symbol === 'DANGCEM');
    const sterling = rows.find((row) => row.symbol === 'STERLINGNG');
    const seplat = rows.find((row) => row.symbol === 'SEPLAT');
    expect(dangote.float_shares).toBe(2_000_000_000);
    expect(dangote.listing_method).toBe('introduction');
    expect(dangote.listing_method_source).toBe('Listing memorandum');
    expect(sterling.listing_method).toBeNull();
    expect(seplat.listing_method).toBeNull();
    const firstHold = rows.find((row) => row.symbol === 'FIRSTHOLDCO');
    expect(firstHold.listing_method).toBe('scheme');
    expect(firstHold.listing_method_as_of).toBe('2012-11-26');
    expect(dangote.bid).toBe(1000);
    expect(dangote.ask).toBe(1010);
    expect(sterling.listing_status == null).toBe(true);
  });
});
