import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  DefaultLegendContent,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HelpHint } from './HelpHint';

/** One unique color per overlay so SMA/EMA/MACD are never the same line. */
const INDICATOR = {
  closeUp: '#16a34a',
  closeDown: '#dc2626',
  sma: '#2563eb',
  ema: '#c026d3',
  bbUpper: '#0891b2',
  bbLower: '#ea580c',
  rsi: '#0f766e',
  macd: '#4d7c0f',
  macdSignal: '#7c3aed',
  macdHistUp: '#65a30d',
  macdHistDown: '#78716c',
  sigma: '#eab308',
  ml: '#9f1239',
};

function formatCurrency(value, symbol) {
  if (!Number.isFinite(value)) return '—';
  return `${symbol}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const DATE_LABEL = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
const TIME_LABEL = { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };

function formatWhen(row) {
  const raw = String(row?.date || '');
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const fromTs = Number.isFinite(Number(row?.timestamp)) ? new Date(Number(row.timestamp)) : null;
  const tsOk = Boolean(fromTs && !Number.isNaN(fromTs.getTime()));

  if (dateOnly) {
    const [year, month, day] = raw.split('-').map(Number);
    const local = new Date(year, month - 1, day);
    const dateLabel = Number.isNaN(local.getTime()) ? raw : local.toLocaleDateString(undefined, DATE_LABEL);
    if (tsOk) {
      const timeLabel = fromTs.toLocaleTimeString(undefined, TIME_LABEL);
      return { dateLabel, timeLabel, summary: `${dateLabel} · ${timeLabel}`, hasTime: true };
    }
    return {
      dateLabel,
      timeLabel: 'Daily bar — the source did not send a clock time',
      summary: dateLabel,
      hasTime: false,
    };
  }

  const instant = tsOk ? fromTs : (raw ? new Date(raw) : null);
  if (!instant || Number.isNaN(instant.getTime())) {
    return {
      dateLabel: raw || 'Unknown date',
      timeLabel: 'Time not available',
      summary: raw || 'Unknown',
      hasTime: false,
    };
  }

  const dateLabel = instant.toLocaleDateString(undefined, DATE_LABEL);
  const timeLabel = instant.toLocaleTimeString(undefined, TIME_LABEL);
  return { dateLabel, timeLabel, summary: `${dateLabel} · ${timeLabel}`, hasTime: true };
}

function formatDateTick(value) {
  const text = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    const local = new Date(year, month - 1, day);
    if (!Number.isNaN(local.getTime())) {
      return local.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }
  }
  const instant = new Date(text);
  if (Number.isNaN(instant.getTime())) return text;
  return instant.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatPctChange(value) {
  if (!Number.isFinite(value)) return null;
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatSigma(z) {
  if (!Number.isFinite(z)) return null;
  return `${Math.abs(z).toFixed(1)}σ`;
}

function resolveMove(row, series = [], priceKey = 'close') {
  let returnPct = Number.isFinite(row?.returnPct) ? row.returnPct : null;
  if (returnPct == null && Array.isArray(series) && series.length) {
    const index = series.findIndex((item) => item?.date === row?.date);
    const prev = index > 0 ? Number(series[index - 1]?.[priceKey]) : NaN;
    const curr = Number(row?.[priceKey]);
    if (Number.isFinite(prev) && prev !== 0 && Number.isFinite(curr)) {
      returnPct = (curr / prev - 1) * 100;
    }
  }
  return {
    returnPct,
    volumeRatio: Number.isFinite(row?.volumeRatio) ? row.volumeRatio : null,
    returnZ: Number.isFinite(row?.returnZ) ? row.returnZ : null,
    volumeZ: Number.isFinite(row?.volumeZ) ? row.volumeZ : null,
  };
}

function explainAnomaly(row, series = [], priceKey = 'close') {
  const move = resolveMove(row, series, priceKey);
  const pct = formatPctChange(move.returnPct);
  const reasons = Array.isArray(row?.anomalyReasons) ? row.anomalyReasons : [];
  let sigmaPrice = row?.sigmaPrice === true || (row?.anomalySigma && (reasons.includes('spike') || reasons.includes('dump')));
  let sigmaVolume = row?.sigmaVolume === true || (row?.anomalySigma && (reasons.includes('volume') || reasons.includes('volumeThin')));
  if (row?.anomalySigma && !sigmaPrice && !sigmaVolume) {
    if (Number.isFinite(move.returnPct) && Math.abs(move.returnPct) >= 1) sigmaPrice = true;
    if (Number.isFinite(move.volumeRatio) && (move.volumeRatio >= 2 || move.volumeRatio <= 0.4)) sigmaVolume = true;
  }
  const priceUp = Number.isFinite(move.returnPct) ? move.returnPct >= 0 : reasons.includes('spike');
  const volumeThin = reasons.includes('volumeThin') || (Number.isFinite(move.volumeZ) && move.volumeZ < 0);
  const returnSigma = formatSigma(move.returnZ);
  const volumeSigma = formatSigma(move.volumeZ);

  const chips = [];
  if (sigmaPrice) {
    chips.push(priceUp ? {
      id: 'spike',
      title: 'Sudden price spike',
      detail: [
        pct ? `Close jumped ${pct} versus the previous bar.` : 'Close jumped versus the previous bar.',
        returnSigma
          ? `That return is ${returnSigma} from typical moves on this chart. 3-sigma flags anything beyond 3σ.`
          : 'That return is more than 3 standard deviations from typical moves on this chart.',
      ].join(' '),
    } : {
      id: 'dump',
      title: 'Sudden price drop',
      detail: [
        pct ? `Close fell ${pct} versus the previous bar.` : 'Close fell versus the previous bar.',
        returnSigma
          ? `That return is ${returnSigma} from typical moves on this chart. 3-sigma flags anything beyond 3σ.`
          : 'That return is more than 3 standard deviations from typical moves on this chart.',
      ].join(' '),
    });
  }
  if (sigmaVolume) {
    chips.push(volumeThin ? {
      id: 'volume',
      title: 'Unusually thin volume',
      detail: [
        Number.isFinite(move.volumeRatio)
          ? `Volume was only ${move.volumeRatio.toFixed(2)}× typical on this chart.`
          : 'Volume was far below typical on this chart.',
        volumeSigma
          ? `That is ${volumeSigma} from typical volume. 3-sigma flags anything beyond 3σ.`
          : 'That is more than 3 standard deviations from typical volume.',
      ].join(' '),
    } : {
      id: 'volume',
      title: 'Sudden volume spike',
      detail: [
        Number.isFinite(move.volumeRatio)
          ? `Volume was ${move.volumeRatio.toFixed(1)}× typical on this chart.`
          : 'Volume jumped far above typical on this chart.',
        volumeSigma
          ? `That is ${volumeSigma} from typical volume. 3-sigma flags anything beyond 3σ.`
          : 'That is more than 3 standard deviations from typical volume.',
      ].join(' '),
    });
  }

  if (!chips.length && row?.anomalyMl) {
    chips.push({
      id: 'mixed',
      title: 'Isolation Forest flag',
      detail: 'Wine dot only: this bar was easy to isolate using return, volume, and range together. It did not break the 3-sigma rule on price or volume alone.',
    });
  }

  let sigmaSummary = 'Not a 3-sigma bar.';
  if (sigmaPrice && sigmaVolume) {
    sigmaSummary = priceUp
      ? '3-sigma flagged both a sudden price spike and a sudden volume spike.'
      : '3-sigma flagged both a sudden price drop and a sudden volume spike.';
  } else if (sigmaPrice) {
    sigmaSummary = priceUp
      ? '3-sigma flagged a sudden price spike. Volume on this bar was not beyond 3σ.'
      : '3-sigma flagged a sudden price drop. Volume on this bar was not beyond 3σ.';
  } else if (sigmaVolume) {
    sigmaSummary = volumeThin
      ? '3-sigma flagged unusually thin volume. The price change was not beyond 3σ.'
      : '3-sigma flagged a sudden volume spike. The price change was not beyond 3σ.';
  }

  return {
    chips,
    headline: chips.map((chip) => chip.title).join(' · ') || 'Unusual bar',
    sigmaSummary,
    showSigmaRule: Boolean(row?.anomalySigma || sigmaPrice || sigmaVolume),
    mlOnly: Boolean(row?.anomalyMl) && !sigmaPrice && !sigmaVolume && !row?.anomalySigma,
  };
}

const TOOLTIP_SKIP = new Set([
  'date',
  'timestamp',
  'sigmaClose',
  'mlClose',
  'anomalySigma',
  'anomalyMl',
  'anomalyScore',
  'anomalyReasons',
  'returnPct',
  'volumeRatio',
  'sigmaPrice',
  'sigmaVolume',
  'returnZ',
  'volumeZ',
]);

function ChartLegend(props) {
  const payload = (props.payload || []).filter((entry) => {
    const key = String(entry?.dataKey || entry?.value || '').toLowerCase();
    return key !== 'date' && key !== 'timestamp';
  });
  return <DefaultLegendContent {...props} payload={payload} />;
}

function ChartTooltip({ active, payload, label, currencySymbol, priceKey }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const when = formatWhen(row || { date: label });
  const items = payload.filter((item) => {
    const key = String(item.dataKey || item.name || '');
    if (TOOLTIP_SKIP.has(key) || TOOLTIP_SKIP.has(key.toLowerCase())) return false;
    return Number.isFinite(Number(item.value));
  });
  return (
    <div className="chartTooltip">
      <p className="chartTooltipDate">{when.dateLabel}</p>
      <p className="chartTooltipTime">{when.timeLabel}</p>
      <ul>
        {items.map((item) => {
          const key = String(item.dataKey || item.name || '');
          const rsi = key.toLowerCase().includes('rsi');
          const volumeOrMacd = /volume|macd/i.test(key) || item.name === 'Volume';
          const display = rsi
            ? Number(item.value).toFixed(1)
            : volumeOrMacd
              ? Number(item.value).toLocaleString(undefined, { maximumFractionDigits: 4 })
              : formatCurrency(item.value, currencySymbol);
          return (
            <li key={item.dataKey || item.name} style={{ color: item.color }}>
              {item.name}: {display}
            </li>
          );
        })}
      </ul>
      {(row?.anomalySigma || row?.anomalyMl) && (
        <p className="chartTooltipFlag">
          {explainAnomaly(row).headline}
          {row.anomalySigma ? ' · 3σ gold' : ''}
          {row.anomalyMl ? ' · ML wine' : ''}
        </p>
      )}
      {priceKey && Number.isFinite(row?.[priceKey]) && !items.some((item) => item.dataKey === priceKey) && (
        <p>Close: {formatCurrency(row[priceKey], currencySymbol)}</p>
      )}
    </div>
  );
}

function WhenCallout({ cx, cy, row, accent }) {
  const when = formatWhen(row);
  const happened = explainAnomaly(row);
  const width = 280;
  const height = 64;
  const flip = cx > 420;
  const x = flip ? cx - 14 - width : cx + 14;
  const y = Math.max(6, cy - height - 12);
  return (
    <g className="anomalyCalloutMark" pointerEvents="none">
      <line x1={cx} y1={cy} x2={flip ? x + width : x} y2={y + height / 2} stroke={accent} strokeWidth={1.5} />
      <rect x={x} y={y} width={width} height={height} rx="8" fill="#0f172a" stroke={accent} strokeWidth={1.6} />
      <text x={x + 10} y={y + 16} fill="#f8fafc" fontSize="11" fontWeight="700">{when.dateLabel}</text>
      <text x={x + 10} y={y + 32} fill="#fde68a" fontSize="11">{when.timeLabel}</text>
      <text x={x + 10} y={y + 50} fill="#fda4af" fontSize="11">{happened.headline}</text>
    </g>
  );
}

function AnomalyDot({ cx, cy, payload, kind, selectedDate, showCallout, onPick, onClick }) {
  if (cx == null || cy == null) return null;
  const active = payload?.date === selectedDate;
  const sigma = kind === 'sigma';
  return (
    <g
      className="anomalyHit"
      cursor="pointer"
      onClick={(event) => {
        event.stopPropagation();
        onPick?.(payload);
        onClick?.(event);
      }}
    >
      <circle cx={cx} cy={cy} r={16} fill="transparent" />
      {sigma ? (
        <circle
          cx={cx}
          cy={cy}
          r={active ? 11 : 9}
          fill="none"
          stroke={INDICATOR.sigma}
          strokeWidth={active ? 4 : 3}
        />
      ) : (
        <circle cx={cx} cy={cy} r={active ? 6.5 : 4.5} fill={INDICATOR.ml} />
      )}
      {active && showCallout ? <WhenCallout cx={cx} cy={cy} row={payload} accent={sigma ? INDICATOR.sigma : INDICATOR.ml} /> : null}
    </g>
  );
}

function sourceLine(provenance) {
  if (!provenance?.source) return 'Source unknown — treat prices as unverified.';
  const name = String(provenance.source).replace(/-/g, ' ');
  const start = provenance.rangeStart ? String(provenance.rangeStart).slice(0, 10) : '';
  const end = provenance.rangeEnd ? String(provenance.rangeEnd).slice(0, 10) : '';
  const range = start && end ? ` · ${start} to ${end}` : '';
  const stale = provenance.stale ? ' · showing a cached copy because the provider did not respond' : '';
  return `Source: ${name}${range}${stale}`;
}

function Toggle({ label, checked, onChange, hint, color, swatchStyle = 'line' }) {
  return (
    <div className="chartToggle">
      <label>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        {color ? (
          <span
            className={`chartToggleSwatch chartToggleSwatch--${swatchStyle}`}
            style={{ background: color }}
            aria-hidden="true"
          />
        ) : null}
        <span>{label}</span>
      </label>
      {hint ? <HelpHint text={hint} label={`What is ${label}?`} /> : null}
    </div>
  );
}

export function MarketChart({
  title,
  data,
  priceKey = 'close',
  volumeKey = 'volume',
  provenance,
  isPositive = true,
  currencySymbol = '',
  changePct = 0,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSma, setShowSma] = useState(true);
  const [showEma, setShowEma] = useState(true);
  const [showBands, setShowBands] = useState(false);
  const [showRsi, setShowRsi] = useState(false);
  const [showMacd, setShowMacd] = useState(false);
  const [showSigma, setShowSigma] = useState(true);
  const [showMl, setShowMl] = useState(true);
  const [picked, setPicked] = useState(null);

  const toggle = useCallback(() => setExpanded((value) => !value), []);
  const pickAnomaly = useCallback((row) => {
    if (!row) return;
    setPicked((prev) => (prev?.date === row.date ? null : row));
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      setPicked(null);
      if (expanded) setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [expanded]);

  const priceColor = isPositive ? INDICATOR.closeUp : INDICATOR.closeDown;
  const changeLabel = `${changePct >= 0 ? '+' : ''}${Number(changePct).toFixed(2)}%`;
  const latestPrice = data?.at(-1)?.[priceKey];
  const chartData = useMemo(() => {
    const source = Array.isArray(data) ? data : [];
    const sampled = source.length <= 600
      ? source
      : Array.from({ length: 600 }, (_, index) => source[Math.round((index * (source.length - 1)) / 599)]);
    return sampled.map((row) => ({
      ...row,
      sigmaClose: row?.anomalySigma && Number.isFinite(row[priceKey]) ? row[priceKey] : null,
      mlClose: row?.anomalyMl && Number.isFinite(row[priceKey]) ? row[priceKey] : null,
    }));
  }, [data, priceKey]);

  // A new series means the previously picked point no longer exists. Adjusting
  // during render rather than in an effect avoids a pass that would paint the
  // new chart with the stale selection still highlighted.
  const [pickedSeries, setPickedSeries] = useState(chartData);
  if (pickedSeries !== chartData) {
    setPickedSeries(chartData);
    setPicked(null);
  }

  const mlCount = useMemo(() => chartData.filter((row) => row.mlClose != null).length, [chartData]);
  const sigmaCount = useMemo(() => chartData.filter((row) => row.sigmaClose != null).length, [chartData]);

  const priceChartHeight = expanded ? 420 : 280;
  const volumeChartHeight = expanded ? 180 : 140;
  const extraChartHeight = expanded ? 160 : 120;
  const hasData = chartData.length > 0;
  const showVolume = hasData && chartData.some((row) => Number(row?.[volumeKey]) > 0);

  const chartContent = !hasData ? (
    <div className="chartWrap" data-guide="price-chart" style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="subtle" style={{ padding: '1.5rem 0.5rem', textAlign: 'center', lineHeight: 1.6 }}>
        No price history for this range. The chart is left empty on purpose.
      </p>
    </div>
  ) : (
    <>
      <div className="panelHeader">
        <div>
          <h3>
            {title}{' '}
            <HelpHint
              label="What does this chart show?"
              text="The main line is the closing price from the named source. Overlays are calculated in this app from those closes. Use the checkboxes to turn them on."
            />
          </h3>
          {latestPrice != null && (
            <span className={`priceTag ${isPositive ? 'up' : 'down'}`}>
              {formatCurrency(latestPrice, currencySymbol)}
            </span>
          )}
          {' '}
          <span className={`pctBadge ${isPositive ? 'up' : 'down'}`}>
            {changePct >= 0 ? '▲' : '▼'} {changeLabel}
          </span>
        </div>
        <div className="chartMetaRow">
          <p className="meta">
            {sourceLine(provenance)}{' '}
            <HelpHint
              label="What does the source line mean?"
              text="This is where the prices came from. Yahoo Finance and CoinGecko can be delayed. If the provider sent no bars, the chart stays empty on purpose."
            />
          </p>
          <button type="button" className="expandBtn" onClick={toggle} aria-label={expanded ? 'Collapse chart' : 'Expand chart'}>
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      <div className="chartToggles" role="group" aria-label="Chart overlays" data-guide="chart-toggles">
        <Toggle
          label="SMA 20"
          color={INDICATOR.sma}
          checked={showSma}
          onChange={setShowSma}
          hint="Simple moving average (blue). Mean of the last 20 closes, each day weighted the same. It lags price on purpose so the trend is easier to see. Not a buy or sell signal."
        />
        <Toggle
          label="EMA 20"
          color={INDICATOR.ema}
          checked={showEma}
          onChange={setShowEma}
          hint="Exponential moving average (magenta). Same 20-day window as SMA, but recent closes count more, so it turns sooner. Compare it with the blue SMA — they are not the same line."
        />
        <Toggle
          label="Bollinger"
          color={INDICATOR.bbUpper}
          checked={showBands}
          onChange={setShowBands}
          hint="Cyan upper band and orange lower band: SMA 20 ± 2 standard deviations. Close near cyan means price has been high versus the last 20 days; near orange means it has been low. The middle is the blue SMA, not a third average."
        />
        <Toggle
          label="RSI"
          color={INDICATOR.rsi}
          checked={showRsi}
          onChange={setShowRsi}
          hint="Relative Strength Index (teal), 14 days, scored 0–100 in its own panel because it is not a price. Guides at 70 and 30 mark stretched-up and stretched-down vs recent closes."
        />
        <Toggle
          label="MACD"
          color={INDICATOR.macd}
          checked={showMacd}
          onChange={setShowMacd}
          hint="Olive MACD line = EMA 12 minus EMA 26. Violet signal = 9-day EMA of that line. Lime/grey bars = the gap between them. Own panel; olive is not the blue SMA."
        />
        <Toggle
          label="Unusual 3σ"
          color={INDICATOR.sigma}
          swatchStyle="dot"
          checked={showSigma}
          onChange={setShowSigma}
          hint="Gold ring. 3-sigma rule: this bar’s price change or its volume was more than 3 standard deviations from typical on this chart. Click the ring to see which one — a sudden price spike/drop, a sudden volume spike, or both."
        />
        <Toggle
          label="Unusual ML"
          color={INDICATOR.ml}
          swatchStyle="dot"
          checked={showMl}
          onChange={setShowMl}
          hint="Wine filled dot. Isolation Forest: this day was easy to isolate from the others using return, volume, and range together. Uncheck this to see gold rings by themselves."
        />
      </div>
      <p className="subtle indicatorColorNote">
        Each overlay uses a different color so SMA (blue) and EMA (magenta) cannot be mistaken for each other, and MACD (olive) is not the SMA line.
      </p>

      <div className="chartWrap" style={{ height: priceChartHeight }} data-guide="price-chart">
        <ResponsiveContainer width="100%" height={priceChartHeight}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" minTickGap={expanded ? 14 : 24} tickFormatter={formatDateTick} />
            <YAxis domain={['auto', 'auto']} tickFormatter={(value) => formatCurrency(value, currencySymbol)} />
            <Tooltip content={<ChartTooltip currencySymbol={currencySymbol} priceKey={priceKey} />} />
            <Legend content={ChartLegend} />
            {showBands && <Line type="monotone" dataKey="bb_upper" stroke={INDICATOR.bbUpper} strokeWidth={1.6} dot={false} name="Upper band" strokeDasharray="5 4" />}
            {showBands && <Line type="monotone" dataKey="bb_lower" stroke={INDICATOR.bbLower} strokeWidth={1.6} dot={false} name="Lower band" strokeDasharray="2 4" />}
            <Line type="monotone" dataKey={priceKey} stroke={priceColor} strokeWidth={2.2} dot={false} name="Close" />
            {showSma && <Line type="monotone" dataKey="sma20" stroke={INDICATOR.sma} strokeWidth={2} dot={false} name="SMA 20" />}
            {showEma && <Line type="monotone" dataKey="ema20" stroke={INDICATOR.ema} strokeWidth={2} dot={false} name="EMA 20" />}
            {showSigma && (
              <Scatter
                dataKey="sigmaClose"
                name="Unusual (3σ gold ring)"
                legendType="circle"
                isAnimationActive={false}
                onClick={(data) => pickAnomaly(data?.payload)}
                shape={(props) => (
                  <AnomalyDot
                    {...props}
                    kind="sigma"
                    selectedDate={picked?.date}
                    showCallout={Boolean(picked) && !(showMl && picked?.anomalyMl)}
                    onPick={pickAnomaly}
                  />
                )}
              />
            )}
            {showMl && (
              <Scatter
                dataKey="mlClose"
                name="Unusual (ML wine)"
                legendType="circle"
                isAnimationActive={false}
                onClick={(data) => pickAnomaly(data?.payload)}
                shape={(props) => (
                  <AnomalyDot
                    {...props}
                    kind="ml"
                    selectedDate={picked?.date}
                    showCallout={Boolean(picked) && picked?.anomalyMl}
                    onPick={pickAnomaly}
                  />
                )}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {picked && (() => {
        const happened = explainAnomaly(picked, chartData, priceKey);
        return (
          <aside className="anomalyCallout" aria-live="polite">
            <div className="anomalyCalloutWhen">
              <p className="anomalyCalloutDate">{formatWhen(picked).dateLabel}</p>
              <p className="anomalyCalloutTime">{formatWhen(picked).timeLabel}</p>
              {happened.showSigmaRule && (
                <div className="sigmaExplain">
                  <p className="sigmaExplainRule">
                    3-sigma (gold ring) flags a bar if the <strong>price change</strong> or the <strong>volume</strong> is more than 3 standard deviations from typical on this chart. That is a description of the bar, not a buy or sell signal.
                  </p>
                  <p className="sigmaExplainFound">{happened.sigmaSummary}</p>
                </div>
              )}
              {happened.mlOnly && (
                <p className="sigmaExplainFound">Isolation Forest (wine) flagged this bar. It did not break the 3-sigma rule on price or volume alone.</p>
              )}
              <div className="anomalyChips">
                {happened.chips.map((chip) => (
                  <span key={chip.id} className={`anomalyChip anomalyChip--${chip.id}`}>
                    <strong>{chip.title}</strong>
                    <span>{chip.detail}</span>
                  </span>
                ))}
              </div>
            </div>
            <dl className="anomalyCalloutFacts">
              <div>
                <dt>Close</dt>
                <dd>{formatCurrency(picked[priceKey], currencySymbol)}</dd>
              </div>
              <div>
                <dt>Flagged by</dt>
                <dd>
                  {picked.anomalySigma ? '3-sigma (gold ring)' : ''}
                  {picked.anomalySigma && picked.anomalyMl ? ' and ' : ''}
                  {picked.anomalyMl ? 'Isolation Forest (wine)' : ''}
                  {!picked.anomalySigma && !picked.anomalyMl ? '—' : ''}
                </dd>
              </div>
            </dl>
            <button type="button" className="expandBtn" onClick={() => setPicked(null)}>Clear</button>
          </aside>
        );
      })()}
      {(showSigma || showMl) && (mlCount > 0 || sigmaCount > 0) && (
        <p className="subtle anomalyNote">
          Unusual versus recent history — not a trading signal.
          Gold rings = 3-sigma ({sigmaCount}); wine dots = Isolation Forest ({mlCount}).
          Click a gold ring to see whether 3-sigma caught a sudden price spike/drop, a sudden volume spike, or both.
          Uncheck Unusual ML to see gold rings by themselves.
        </p>
      )}

      {showRsi && (
        <div className="chartWrap" style={{ height: extraChartHeight }}>
          <ResponsiveContainer width="100%" height={extraChartHeight}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={24} tickFormatter={formatDateTick} />
              <YAxis domain={[0, 100]} />
              <Tooltip content={<ChartTooltip currencySymbol="" priceKey="rsi14" />} />
              <Legend content={ChartLegend} />
              <ReferenceLine y={70} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: '70', fill: '#64748b', fontSize: 10 }} />
              <ReferenceLine y={30} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: '30', fill: '#64748b', fontSize: 10 }} />
              <Line type="monotone" dataKey="rsi14" stroke={INDICATOR.rsi} strokeWidth={2} dot={false} name="RSI 14" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {showMacd && (
        <div className="chartWrap" style={{ height: extraChartHeight }}>
          <ResponsiveContainer width="100%" height={extraChartHeight}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={24} tickFormatter={formatDateTick} />
              <YAxis />
              <Tooltip content={<ChartTooltip currencySymbol="" priceKey="macd" />} />
              <Legend content={ChartLegend} />
              <Bar dataKey="macd_hist" name="MACD hist">
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`${entry.date}-macd-${idx}`}
                    fill={(entry.macd_hist || 0) >= 0 ? INDICATOR.macdHistUp : INDICATOR.macdHistDown}
                  />
                ))}
              </Bar>
              <Line type="monotone" dataKey="macd" stroke={INDICATOR.macd} strokeWidth={2} dot={false} name="MACD" />
              <Line type="monotone" dataKey="macd_signal" stroke={INDICATOR.macdSignal} strokeWidth={2} dot={false} name="Signal" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {showVolume && (
        <div className="chartWrap" style={{ height: volumeChartHeight }}>
          <ResponsiveContainer width="100%" height={volumeChartHeight}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={expanded ? 14 : 24} tickFormatter={formatDateTick} />
              <YAxis />
              <Tooltip content={<ChartTooltip currencySymbol="" priceKey={volumeKey} />} />
              <Bar dataKey={volumeKey} name="Volume">
                {chartData.map((entry, idx) => {
                  const prev = chartData[idx - 1]?.[priceKey];
                  const curr = entry?.[priceKey];
                  const up = idx === 0 ? true : curr >= prev;
                  return <Cell key={`${entry.date}-${idx}`} fill={up ? '#22c55e' : '#ef4444'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );

  if (expanded) {
    return (
      <>
        <section className="panel">
          <div className="panelHeader">
            <h3>{title}</h3>
            <button type="button" className="expandBtn" onClick={toggle}>Close expanded view</button>
          </div>
        </section>
        <div className="chartOverlay" onClick={(event) => { if (event.target === event.currentTarget) setExpanded(false); }}>
          <div className="chartExpanded" role="dialog" aria-modal="true" aria-label={`${title} expanded chart`}>
            {chartContent}
          </div>
        </div>
      </>
    );
  }

  return <section className="panel">{chartContent}</section>;
}
