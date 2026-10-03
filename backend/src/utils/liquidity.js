/**
 * Can a normal person sell?
 *
 * A normal sale is ₦500,000 on NGX, $2,000 on US stocks, $1,000 in crypto.
 * Red when that sale is at least 1/10 of the money that traded, or nothing traded.
 * Amber when it is at least 1/40.
 * Each badge names the factor that decided it: low free float, no or very
 * low demand, or a wide bid–ask. Suspension, delisting, a corporate action,
 * settlement, and market hours are tagged only when the feed says so.
 * A missing number is not published, and it is never treated as a zero.
 */

export const NORMAL_SALE = { ngx: 500_000, us: 2_000, crypto: 1_000 };
export const SALE_SHARE_RED = 0.1;
export const SALE_SHARE_AMBER = 0.025;
export const CLOSELY_HELD_RED = 0.8;
export const CLOSELY_HELD_AMBER = 0.5;
/** Share-count fallback when price is missing: rarer than 1 in 100,000. */
export const TURNOVER_RED = 0.00001;
export const TURNOVER_AMBER = 0.0001;
/** Bid–ask gap versus the middle price. Wider than this is hard / slow to sell. */
export const SPREAD_RED = 0.05;
export const SPREAD_AMBER = 0.02;

const TONE_LABEL = {
  red: 'Hard to sell',
  amber: 'Slow to sell',
  ok: 'Easy to sell',
  unknown: 'Not enough to tell',
};

function num(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function unitInterval(value) {
  const n = num(value);
  if (n == null) return null;
  if (n > 1 && n <= 100) return n / 100;
  if (n < 0 || n > 1) return null;
  return n;
}

export function plausibleFloat(floatShares, sharesOutstanding) {
  const floatN = num(floatShares);
  const shares = num(sharesOutstanding);
  if (floatN == null || shares == null || shares <= 0 || floatN <= 0) return null;
  const ratio = floatN / shares;
  if (ratio < 0.005 || ratio > 1.05) return null;
  return floatN;
}

export function median(values) {
  const finite = (values || []).filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return null;
  const mid = Math.floor(finite.length / 2);
  return finite.length % 2 ? finite[mid] : (finite[mid - 1] + finite[mid]) / 2;
}

export function quantile(values, q) {
  const finite = (values || []).filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return null;
  const pos = Math.min(finite.length - 1, Math.max(0, (finite.length - 1) * q));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return finite[lo];
  return finite[lo] + (finite[hi] - finite[lo]) * (pos - lo);
}

export function normalSale(venue) {
  return NORMAL_SALE[venue] || NORMAL_SALE.us;
}

export function formatMoney(value, venue = 'us') {
  const n = num(value);
  if (n == null) return null;
  const sym = venue === 'ngx' ? '₦' : '$';
  const abs = Math.abs(n);
  const units = [
    [1e12, 'trillion'],
    [1e9, 'billion'],
    [1e6, 'million'],
  ];
  for (const [size, label] of units) {
    if (abs >= size) {
      const shown = n / size;
      const digits = Math.abs(shown) >= 10 ? 0 : 1;
      return `${sym}${shown.toFixed(digits).replace(/\.0$/, '')} ${label}`;
    }
  }
  return `${sym}${Math.round(n).toLocaleString('en-US')}`;
}

export function oneInLabel(turnover) {
  if (!Number.isFinite(turnover) || turnover <= 0) return null;
  const raw = 1 / turnover;
  if (raw < 2) return 'Most shares traded';
  const digits = Math.floor(Math.log10(raw));
  const step = 10 ** Math.max(0, digits - 1);
  const rounded = Math.max(step, Math.round(raw / step) * step);
  return `1 in ${rounded.toLocaleString('en-US')}`;
}

export function sizeMovedPhrase(ratio) {
  if (!Number.isFinite(ratio) || ratio < 0) return null;
  const pct = ratio * 100;
  if (pct >= 10) return `${Math.round(pct)}% of the coin`;
  if (pct >= 1) return `About ${Math.round(pct)}% of the coin`;
  if (pct > 0) return 'A small piece of the coin';
  return 'Almost none of the coin';
}

export function percentLabel(ratio) {
  if (!Number.isFinite(ratio) || ratio < 0) return null;
  const pct = ratio * 100;
  if (pct >= 10) return `${Math.round(pct)}%`;
  return `${pct.toFixed(1).replace(/\.0$/, '')}%`;
}

/** Ignore a gap wider than 80%: that is a broken quote, not a market. */
export function quoteSpread(bid, ask) {
  const buy = num(bid);
  const sell = num(ask);
  if (!(buy > 0) || !(sell >= buy)) return null;
  const mid = (sell + buy) / 2;
  if (!(mid > 0)) return null;
  const spread = (sell - buy) / mid;
  if (spread > 0.8) return null;
  return spread;
}

/** Average volume and naira/dollar value across loaded sessions. Needs at least 3 bars. */
export function sessionAverages(series) {
  const rows = (series || []).filter((bar) => {
    const close = num(bar?.close);
    const volume = num(bar?.volume);
    return close != null && close > 0 && volume != null && volume >= 0;
  });
  if (rows.length < 3) return null;
  const volume = rows.reduce((sum, bar) => sum + Number(bar.volume), 0) / rows.length;
  const value = rows.reduce((sum, bar) => sum + Number(bar.volume) * Number(bar.close), 0) / rows.length;
  if (!(value > 0)) return null;
  return { averageVolume: volume, averageValue: value, averageSessions: rows.length };
}

export function saleSlicePhrase(share) {
  if (!Number.isFinite(share) || share < 0) return null;
  if (share >= 1) return 'bigger than the whole day';
  if (share >= 0.45) return 'about half the day';
  if (share >= 0.3) return 'about a third of the day';
  if (share >= 0.18) return 'about 1 in 5 of the day';
  if (share >= 0.08) return 'about 1 in 10 of the day';
  if (share >= 0.04) return 'about 1 in 20 of the day';
  if (share >= 0.02) return 'about 1 in 40 of the day';
  if (share >= 0.01) return 'about 1 in 100 of the day';
  return 'a tiny slice of the day';
}

export function liquidityMetrics(row = {}) {
  const volume = num(row.volume);
  const statedAverage = num(row.averageVolume);
  const averageVolume = statedAverage ?? volume;
  const sharesOutstanding = num(row.sharesOutstanding);
  const floatShares = plausibleFloat(row.floatShares, sharesOutstanding);
  const insiderPct = unitInterval(row.insiderPct);
  const price = num(row.price);
  const marketCap = num(row.marketCap)
    ?? (price != null && sharesOutstanding != null ? price * sharesOutstanding : null);
  const tradable = floatShares ?? sharesOutstanding;
  const typical = num(row.averageVolume);
  // A zero morning print on a US or crypto name is not "nobody ever trades this".
  // NGX zeros are real session zeros — Pulse has no separate average to fall back on.
  const usedTypical = row.venue !== 'ngx' && (volume == null || volume === 0) && typical > 0;
  const prints = usedTypical ? typical : (volume ?? typical);
  const turnover = prints != null && tradable > 0 ? prints / tradable : null;
  const valueTraded = num(row.valueTraded) != null && !usedTypical
    ? num(row.valueTraded)
    : (prints != null && price != null ? prints * price : num(row.valueTraded));
  const capTurnover = valueTraded != null && marketCap > 0
    ? valueTraded / marketCap
    : turnover;
  const floatRatio = floatShares != null && sharesOutstanding > 0
    ? Math.min(floatShares / sharesOutstanding, 1)
    : null;
  const closelyHeldPct = floatRatio != null ? 1 - floatRatio : null;
  const averageValue = num(row.averageValue)
    ?? (statedAverage != null && price != null ? statedAverage * price : null);
  const averageSessions = num(row.averageSessions);
  const spread = quoteSpread(row.bid, row.ask);

  return {
    volume,
    averageVolume,
    averageValue,
    averageSessions,
    spread,
    sharesOutstanding,
    floatShares,
    insiderPct,
    price,
    marketCap,
    tradable,
    turnover,
    capTurnover,
    valueTraded,
    floatRatio,
    closelyHeldPct,
    usedTypical,
  };
}

function pushFlag(flags, severity, code, text) {
  flags.push({ severity, code, text });
}

function quietFraction(volumes) {
  const known = (volumes || []).filter((value) => value != null && Number.isFinite(Number(value)));
  if (known.length < 8) return 0;
  return known.filter((value) => Number(value) === 0).length / known.length;
}

function card(key, label, value, hint) {
  if (!value) return null;
  return { key, label, value, hint: hint || '' };
}

function reasonFromFlag(flag, marketOpen) {
  if (!flag) return null;
  switch (flag.code) {
    case 'NO_PRINTS':
      return 'No demand';
    case 'HARD_TO_SELL':
      return 'Very low demand';
    case 'THIN_AVERAGE':
      return flag.severity === 'amber' ? 'Low demand' : 'Very low demand';
    case 'SLOW_TO_SELL':
    case 'BELOW_PEERS':
      return 'Low demand';
    case 'TIGHT_FLOAT':
    case 'NARROW_FLOAT':
    case 'INSIDER_CONTROL':
    case 'INSIDER_WEIGHT':
      return 'Low free float';
    case 'WIDE_SPREAD':
      return 'Wide spread';
    case 'SUSPENDED':
      return 'Suspended';
    case 'DELISTED':
      return 'Delisted';
    case 'CORPORATE_ACTION':
      return 'Corporate action';
    case 'QUIET_BOARD':
      return marketOpen === false ? 'Market closed' : 'Not enough to tell';
    default:
      return null;
  }
}

function sellFactors({
  venue,
  metrics,
  typicalShare,
  saleShare,
  reason,
  marketOpen,
  listingStatus,
  corporateAction,
  corporateActionNote,
  tone,
}) {
  const demandTone = tone === 'unknown'
    ? 'unknown'
    : metrics.volume === 0 && saleShare == null
    ? 'red'
    : saleShare >= SALE_SHARE_RED || typicalShare >= SALE_SHARE_RED
      ? 'red'
      : saleShare >= SALE_SHARE_AMBER || typicalShare >= SALE_SHARE_AMBER
        ? 'amber'
        : (saleShare != null || metrics.valueTraded > 0)
          ? 'ok'
          : 'unknown';
  const demandValue = demandTone === 'red' && metrics.volume === 0
    ? 'No demand'
    : demandTone === 'red'
      ? 'Very low demand'
      : demandTone === 'amber'
        ? 'Low demand'
        : demandTone === 'ok'
          ? 'Demand is there'
          : 'Not enough to tell';
  const floatTone = metrics.floatRatio != null
    ? (metrics.floatRatio <= 0.2 ? 'red' : metrics.floatRatio <= 0.5 ? 'amber' : 'ok')
    : metrics.insiderPct != null
      ? (metrics.insiderPct >= CLOSELY_HELD_RED ? 'red' : metrics.insiderPct >= CLOSELY_HELD_AMBER ? 'amber' : 'ok')
      : 'unknown';
  const spreadTone = metrics.spread == null
    ? 'unknown'
    : metrics.spread >= SPREAD_RED
      ? 'red'
      : metrics.spread >= SPREAD_AMBER
        ? 'amber'
        : 'ok';
  const listing = String(listingStatus || '').toLowerCase();
  const listingTone = listing === 'delisted' || listing === 'suspended' || listing === 'halted' ? 'red' : 'unknown';
  const hoursTone = venue === 'crypto' ? 'ok' : marketOpen === false ? 'amber' : marketOpen === true ? 'ok' : 'unknown';
  const settlement = venue === 'ngx'
    ? { value: 'Two trading days', hint: 'Cash from a sale is due two trading days later. The wait is the same for every NGX name, so it is not why one name is harder than another.' }
    : venue === 'us'
      ? { value: 'Next trading day', hint: 'Cash from a sale is due the next trading day. The wait is the same for every US name, so it is not why one name is harder than another.' }
      : { value: 'At once', hint: 'A trade on the exchange settles immediately.' };

  const factors = [
    {
      key: 'float',
      label: 'Free float',
      value: venue === 'crypto'
        ? 'Does not apply'
        : metrics.floatRatio != null
          ? `${Math.round(metrics.floatRatio * 100)}% of the shares`
          : metrics.insiderPct != null
            ? `Insiders hold ${Math.round(metrics.insiderPct * 100)}%`
            : 'Not published',
      hint: venue === 'crypto'
        ? 'A coin has no share float.'
        : metrics.floatRatio != null || metrics.insiderPct != null
          ? 'A low free float means fewer shares are actually for sale.'
          : 'This feed does not say how many shares are free to trade.',
      tone: venue === 'crypto' ? 'ok' : floatTone,
    },
    {
      key: 'demand',
      label: 'Demand',
      value: demandValue,
      hint: metrics.averageValue > 0
        ? `A usual day trades about ${formatMoney(metrics.averageValue, venue)}.`
        : metrics.valueTraded > 0
          ? `${formatMoney(metrics.valueTraded, venue)} traded in the latest session.`
          : 'Nothing traded in the latest session.',
      tone: demandTone,
    },
    {
      key: 'spread',
      label: 'Bid–ask spread',
      value: metrics.spread == null ? 'Not published' : percentLabel(metrics.spread),
      hint: metrics.spread == null
        ? 'This feed does not publish the bid and the ask. A wide gap makes the next sale worse than the last price.'
        : spreadTone === 'ok'
          ? 'The bid and the ask are close.'
          : 'The gap is wide enough that a sale can print below the last price.',
      tone: spreadTone,
    },
    {
      key: 'listing',
      label: 'Delisting or suspension',
      value: venue === 'crypto'
        ? 'Does not apply'
        : listing === 'delisted'
          ? 'Delisted'
          : listing === 'suspended' || listing === 'halted'
            ? 'Suspended'
            : 'Not published',
      hint: listingTone === 'red'
        ? 'The exchange is not taking a normal sale in this name.'
        : 'This feed does not say whether the name is suspended or being delisted.',
      tone: venue === 'crypto' ? 'ok' : listingTone,
    },
    {
      key: 'action',
      label: 'Corporate action',
      value: corporateAction ? 'In progress' : 'Not published',
      hint: corporateAction
        ? (corporateActionNote || 'A corporate action is on the record for this name. Ask a broker whether the sale still goes through.')
        : 'This feed does not say whether a split, a bonus, or a rights issue is under way.',
      tone: corporateAction ? 'amber' : 'unknown',
    },
    {
      key: 'settlement',
      label: 'Settlement',
      value: settlement.value,
      hint: settlement.hint,
      tone: 'ok',
    },
    {
      key: 'hours',
      label: 'Market hours',
      value: venue === 'crypto' ? 'Trades all day' : marketOpen === false ? 'Closed' : marketOpen === true ? 'Open' : 'Not published',
      hint: venue === 'crypto'
        ? 'Crypto does not stop for a session clock.'
        : marketOpen === false
          ? 'The session is closed, so a sale waits until the next open. That does not change how easy the last session was.'
          : marketOpen === true
            ? 'The session is open.'
            : 'This screen does not know whether the session is open.',
      tone: hoursTone,
    },
  ];

  const causeKey = {
    'No demand': 'demand',
    'Very low demand': 'demand',
    'Low demand': 'demand',
    'Demand is there': 'demand',
    'Low free float': 'float',
    'Wide spread': 'spread',
    'Suspended': 'listing',
    'Delisted': 'listing',
    'Corporate action': 'action',
    'Market closed': 'hours',
  }[reason] || null;

  return factors.map((factor) => ({
    ...factor,
    cause: factor.key === causeKey,
  }));
}

/**
 * tone: red | amber | ok | unknown
 * label is the plain-language badge.
 */
export function assessLiquidity(row = {}, context = {}) {
  const venue = row.venue || context.venue || 'us';
  const metrics = liquidityMetrics(row);
  const flags = [];
  const sale = normalSale(venue);
  const saleLabel = formatMoney(sale, venue);
  const dayLabel = formatMoney(metrics.valueTraded, venue);
  const flow = metrics.turnover ?? metrics.capTurnover;
  const saleShare = metrics.valueTraded > 0 ? sale / metrics.valueTraded : null;
  const slice = saleSlicePhrase(saleShare);
  const moved = oneInLabel(metrics.turnover);
  const unitWord = venue === 'crypto' ? 'coin' : 'stock';
  const dayWord = venue === 'crypto' ? '24 hours' : 'latest session';
  const boardIsQuiet = quietFraction(context.peerVolumes) >= 0.6;
  const marketOpen = venue === 'crypto' ? true : context.marketOpen;
  const listingStatus = String(row.listingStatus || '').toLowerCase();

  if (listingStatus === 'delisted') {
    pushFlag(
      flags,
      'red',
      'DELISTED',
      'This name is delisted. The exchange is not taking a normal sale.',
    );
  } else if (listingStatus === 'suspended' || listingStatus === 'halted') {
    pushFlag(
      flags,
      'red',
      'SUSPENDED',
      'Trading is suspended. A sale has to wait until the exchange lets it through.',
    );
  }

  if (!metrics.usedTypical && metrics.volume === 0) {
    if (boardIsQuiet) {
      pushFlag(
        flags,
        'unknown',
        'QUIET_BOARD',
        marketOpen === false
          ? 'The market is closed. Almost nothing on this list traded because the session is not open. That is not a verdict on this one name.'
          : 'Almost nothing on this list traded. The session may be closed, or the numbers have not updated yet. That is not a verdict on this one name.',
      );
    } else {
      pushFlag(
        flags,
        'red',
        'NO_PRINTS',
        `Nothing in this ${unitWord} changed hands in the ${dayWord}. The last price can still be on the screen, but there may be no buyer if you want to sell.`,
      );
    }
  } else if (saleShare != null && saleShare >= SALE_SHARE_RED) {
    pushFlag(
      flags,
      'red',
      'HARD_TO_SELL',
      `A normal ${saleLabel} sale would be ${slice}. Only ${dayLabel} traded in the ${dayWord}, so getting in can be easier than getting out quickly.`,
    );
  } else if (saleShare != null && saleShare >= SALE_SHARE_AMBER) {
    pushFlag(
      flags,
      'amber',
      'SLOW_TO_SELL',
      `A normal ${saleLabel} sale would be ${slice}. You can usually sell, but it may take time or nudge the price.`,
    );
  } else if (saleShare == null && flow != null && flow < TURNOVER_RED) {
    pushFlag(
      flags,
      'red',
      'HARD_TO_SELL',
      moved
        ? `Only about ${moved} shares traded. That is too little to count on a quick sale.`
        : 'Very little of this stock traded, so a quick sale is hard to count on.',
    );
  } else if (saleShare == null && flow != null && flow < TURNOVER_AMBER) {
    pushFlag(
      flags,
      'amber',
      'SLOW_TO_SELL',
      'Less of this stock traded than you would want for an easy sale.',
    );
  }

  const typicalShare = metrics.averageValue > 0 ? sale / metrics.averageValue : null;
  const typicalSlice = saleSlicePhrase(typicalShare);
  const sessionNote = metrics.averageSessions
    ? `Across the ${metrics.averageSessions} sessions loaded, about ${formatMoney(metrics.averageValue, venue)} traded on a typical day.`
    : `A usual day trades about ${formatMoney(metrics.averageValue, venue)}.`;
  if (
    typicalShare != null
    && !metrics.usedTypical
    && metrics.volume !== 0
    && !flags.some((flag) => flag.code === 'NO_PRINTS' || flag.code === 'QUIET_BOARD')
    && (saleShare == null || typicalShare > saleShare)
  ) {
    if (typicalShare >= SALE_SHARE_RED && (saleShare == null || saleShare < SALE_SHARE_RED)) {
      pushFlag(
        flags,
        'red',
        'THIN_AVERAGE',
        `A normal ${saleLabel} sale would be ${typicalSlice} of a typical day. ${sessionNote}`,
      );
    } else if (typicalShare >= SALE_SHARE_AMBER && (saleShare == null || saleShare < SALE_SHARE_AMBER)) {
      pushFlag(
        flags,
        'amber',
        'THIN_AVERAGE',
        `A normal ${saleLabel} sale would be ${typicalSlice} of a typical day. ${sessionNote}`,
      );
    }
  }

  if (metrics.spread != null && metrics.spread >= SPREAD_RED) {
    pushFlag(
      flags,
      'red',
      'WIDE_SPREAD',
      `The ask is about ${percentLabel(metrics.spread)} above the bid. That gap means the next sale can be well below the last price.`,
    );
  } else if (metrics.spread != null && metrics.spread >= SPREAD_AMBER) {
    pushFlag(
      flags,
      'amber',
      'WIDE_SPREAD',
      `The ask is about ${percentLabel(metrics.spread)} above the bid. A sale may have to give up some of the last price.`,
    );
  }

  if (metrics.insiderPct != null && metrics.insiderPct >= CLOSELY_HELD_RED) {
    pushFlag(
      flags,
      'red',
      'INSIDER_CONTROL',
      `Insiders are reported to hold ${(metrics.insiderPct * 100).toFixed(0)}% of the shares. Most of the stock is not up for sale, even if some shares still trade.`,
    );
  } else if (metrics.insiderPct != null && metrics.insiderPct >= CLOSELY_HELD_AMBER) {
    pushFlag(
      flags,
      'amber',
      'INSIDER_WEIGHT',
      `Insiders are reported to hold ${(metrics.insiderPct * 100).toFixed(0)}% of the shares. A large part of the stock is not freely for sale.`,
    );
  }

  const insiderAlready = flags.some((flag) => flag.code === 'INSIDER_CONTROL' || flag.code === 'INSIDER_WEIGHT');
  if (!insiderAlready && metrics.closelyHeldPct != null && metrics.closelyHeldPct >= CLOSELY_HELD_RED) {
    pushFlag(
      flags,
      'red',
      'TIGHT_FLOAT',
      `Only about ${((metrics.floatRatio || 0) * 100).toFixed(0)}% of the shares are free to trade. The rest sits with long-term holders.`,
    );
  } else if (!insiderAlready && metrics.closelyHeldPct != null && metrics.closelyHeldPct >= CLOSELY_HELD_AMBER) {
    pushFlag(
      flags,
      'amber',
      'NARROW_FLOAT',
      `Only about ${((metrics.floatRatio || 0) * 100).toFixed(0)}% of the shares are free to trade.`,
    );
  }

  const peerTurnovers = context.peerTurnovers || [];
  const medianTurnover = median(peerTurnovers);
  const p20 = quantile(peerTurnovers, 0.2);
  const medianCap = median(context.peerCaps || []);
  const alreadyRed = flags.some((flag) => flag.severity === 'red');
  if (
    venue === 'ngx'
    && !alreadyRed
    && flow != null
    && p20 != null
    && medianCap != null
    && metrics.marketCap != null
    && metrics.marketCap >= medianCap
    && flow <= p20
    && !flags.some((flag) => flag.code === 'NO_PRINTS' || flag.code === 'QUIET_BOARD')
  ) {
    pushFlag(
      flags,
      'info',
      'LARGE_THIN',
      'This is a large company and among the quietest on the list, so most of its shares did not trade. A normal sale can still be a small part of the money that did trade. NGX does not publish an owner list on this screen.',
    );
  } else if (
    medianTurnover != null
    && flow != null
    && flow < medianTurnover * 0.25
    && !flags.some((flag) => flag.severity === 'red' || flag.code === 'SLOW_TO_SELL' || flag.code === 'QUIET_BOARD')
  ) {
    const saleAlreadyEasy = saleShare != null && saleShare < SALE_SHARE_AMBER;
    pushFlag(
      flags,
      saleAlreadyEasy ? 'info' : 'amber',
      'BELOW_PEERS',
      saleAlreadyEasy
        ? 'Fewer of its shares traded than a typical name on this list. A normal sale is still a small part of the money that did trade.'
        : 'It traded much less than a typical name on this list.',
    );
  }

  if (
    venue === 'ngx'
    && metrics.turnover > 0
    && metrics.turnover < 0.00005
    && flags.some((flag) => flag.severity === 'red')
    && !flags.some((flag) => flag.code === 'LARGE_THIN' || flag.code === 'INSIDER_CONTROL' || flag.code === 'TIGHT_FLOAT')
  ) {
    pushFlag(
      flags,
      'red',
      'MOST_SHARES_SAT',
      moved
        ? `Only about ${moved} shares moved. Most of the company did not trade. NGX does not say who holds the rest.`
        : 'Most of the shares did not trade. NGX does not say who holds them.',
    );
  }

  let tone = 'unknown';
  if (flags.some((flag) => flag.severity === 'red')) tone = 'red';
  else if (flags.some((flag) => flag.severity === 'amber')) tone = 'amber';
  else if (flags.some((flag) => flag.code === 'QUIET_BOARD')) tone = 'unknown';
  else if (flow != null || metrics.volume != null || metrics.valueTraded != null) tone = 'ok';

  const leadFlag = flags.find((flag) => flag.code === 'DELISTED' || flag.code === 'SUSPENDED')
    || flags.find((flag) => flag.code === 'INSIDER_CONTROL' || flag.code === 'TIGHT_FLOAT')
    || flags.find((flag) => flag.code === 'NO_PRINTS' || flag.code === 'QUIET_BOARD')
    || flags.find((flag) => flag.severity === 'red')
    || flags.find((flag) => flag.severity === 'amber')
    || null;
  const reason = reasonFromFlag(leadFlag, marketOpen)
    || (tone === 'ok' ? 'Demand is there' : 'Not enough to tell');
  const marketClosed = venue !== 'crypto' && marketOpen === false;
  const lead = leadFlag?.text
    || (tone === 'ok'
      ? `Plenty of this ${unitWord} changed hands next to a normal ${saleLabel} sale, so getting out is usually straightforward.`
      : 'There is not enough trading data to say how easy a sale would be.');
  const notes = flags.filter((flag) => flag !== leadFlag).slice(0, 2).map((flag) => flag.text);

  const cards = [
    card(
      'traded',
      venue === 'crypto' ? 'Traded in 24 hours' : 'Traded today',
      metrics.volume === 0 ? (venue === 'ngx' ? '₦0' : '$0') : dayLabel,
      metrics.volume === 0 && !metrics.usedTypical
        ? 'Nothing changed hands'
        : metrics.usedTypical
          ? 'A typical day — the latest print was empty'
          : (venue !== 'crypto' && Number.isFinite(metrics.volume) ? `${metrics.volume.toLocaleString('en-US')} shares` : ''),
    ),
    card(
      'sale',
      'A normal sale',
      saleLabel,
      slice ? `Would be ${slice}` : 'What we compare the day with',
    ),
      venue === 'crypto'
      ? card(
        'size',
        'How much of the coin',
        sizeMovedPhrase(metrics.capTurnover),
        'Compared with the whole coin, not with your sale',
      )
      : card(
        'moved',
        'Shares that moved',
        metrics.volume === 0 ? 'None' : moved,
        metrics.volume === 0
          ? 'No shares traded'
          : (metrics.turnover != null && metrics.turnover < 0.00005)
            ? 'Most of the shares stayed put'
            : 'Compared with all the shares',
      ),
  ].filter(Boolean);

  let tableLine = 'A normal sale is a tiny slice of the day';
  if (flags.some((flag) => flag.code === 'QUIET_BOARD')) tableLine = 'Whole list looks quiet — session may be closed';
  else if (flags.some((flag) => flag.code === 'NO_PRINTS')) tableLine = 'Nothing traded in the latest session';
  else if (flags.some((flag) => flag.code === 'INSIDER_CONTROL')) {
    tableLine = `Insiders hold ${(metrics.insiderPct * 100).toFixed(0)}% — most shares are not for sale`;
  } else if (flags.some((flag) => flag.code === 'TIGHT_FLOAT')) {
    tableLine = `Only about ${((metrics.floatRatio || 0) * 100).toFixed(0)}% of shares are free to trade`;
  } else if (flags.some((flag) => flag.code === 'WIDE_SPREAD' && (flag.severity === 'red' || flag.severity === 'amber'))) {
    tableLine = `Bid–ask gap is about ${percentLabel(metrics.spread)}`;
  } else if (flags.some((flag) => flag.code === 'THIN_AVERAGE') && typicalSlice) {
    tableLine = `A ${saleLabel} sale is ${typicalSlice} of a typical day`;
  } else if (slice && (tone === 'red' || tone === 'amber')) tableLine = `A ${saleLabel} sale is ${slice}`;
  else if (flags.some((flag) => flag.code === 'INSIDER_WEIGHT')) {
    tableLine = `Insiders hold ${(metrics.insiderPct * 100).toFixed(0)}% of the shares`;
  } else if (flags.some((flag) => flag.code === 'BELOW_PEERS')) tableLine = 'Traded much less than a typical name here';

  return {
    ok: true,
    tone,
    venue,
    flags,
    metrics,
    peerMedianTurnover: medianTurnover,
    label: TONE_LABEL[tone],
    reason,
    marketClosed,
    lead,
    notes,
    cards,
    factors: sellFactors({
      venue,
      metrics,
      typicalShare,
      saleShare,
      reason,
      marketOpen,
      listingStatus,
      corporateAction: Boolean(row.corporateAction),
      corporateActionNote: row.corporateActionNote || '',
      tone,
    }),
    tableLine,
    saleSize: sale,
    saleShare,
    disclaimer: 'A warning from these numbers. It is not a broker, and it does not mean you are banned from buying or selling.',
  };
}

export function scoreLiquidityBoard(rows, venue = 'ngx', context = {}) {
  const normalized = (rows || []).map((row) => ({
    ...row,
    venue: row.venue || venue,
    ...liquidityMetrics({ ...row, venue: row.venue || venue }),
  }));
  const peerTurnovers = normalized.map((row) => row.turnover ?? row.capTurnover);
  const peerCaps = normalized.map((row) => row.marketCap);
  const peerVolumes = normalized.map((row) => row.volume);
  return normalized.map((row) => {
    const reading = assessLiquidity(row, { venue, peerTurnovers, peerCaps, peerVolumes, ...context });
    return {
      id: row.id || null,
      symbol: row.symbol || row.id,
      name: row.name || row.symbol || row.id,
      sector: row.sector || row.category || null,
      tone: reading.tone,
      label: reading.label,
      reason: reading.reason,
      marketClosed: reading.marketClosed,
      flags: reading.flags,
      tableLine: reading.tableLine,
      tradedLabel: reading.cards.find((item) => item.key === 'traded')?.value || '—',
      turnover: reading.metrics.turnover ?? reading.metrics.capTurnover,
      valueTraded: reading.metrics.valueTraded,
      volume: reading.metrics.volume,
      marketCap: reading.metrics.marketCap,
      closelyHeldPct: reading.metrics.closelyHeldPct,
      insiderPct: reading.metrics.insiderPct,
    };
  }).sort((a, b) => {
    const rank = { red: 0, amber: 1, unknown: 2, ok: 3 };
    const d = (rank[a.tone] ?? 9) - (rank[b.tone] ?? 9);
    if (d !== 0) return d;
    return (a.turnover ?? 1) - (b.turnover ?? 1);
  });
}
