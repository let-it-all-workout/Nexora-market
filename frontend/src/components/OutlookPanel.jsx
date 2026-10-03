import { HelpHint } from './HelpHint';

const HORIZONS = [
  { years: 1, label: '1 year' },
  { years: 2, label: '2 years' },
  { years: 3, label: '3 years' },
  { years: 5, label: '5 years' },
];

function formatPct(value) {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatYears(value) {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.abs(value - Math.round(value)) < 0.05 ? String(Math.round(value)) : value.toFixed(1);
  const count = Number(rounded);
  return `${rounded} year${count === 1 ? '' : 's'}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDay(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function historyLine(data) {
  const count = Number(data.barCount).toLocaleString();
  const from = formatDay(data.lookbackStart);
  const to = formatDay(data.lookbackEnd);
  const years = formatYears(data.lookbackYears);
  let line = `Drawn from ${count} daily closes`;
  if (from && to) line += `, from ${from} to ${to}`;
  if (years) line += ` — ${years} of prices`;
  line += '.';
  if (Number.isFinite(data.realizedCagr)) {
    const pct = formatPct(Math.abs(data.realizedCagr * 100));
    const verb = data.realizedCagr < 0 ? 'fell' : 'rose';
    line += ` Over that stretch it ${verb} ${pct.replace('+', '')} a year.`;
  }
  if (data.sampleLimited) {
    line += ' The long price series was unavailable, so this uses about one year from CoinGecko.';
  }
  return line;
}

export function OutlookPanel({
  title,
  hint,
  years,
  onYears,
  data,
  error,
  loading,
  formatPrice,
}) {
  const scale = Number.isFinite(data?.fxScale) && data.fxScale > 0 ? data.fxScale : 1;
  const tone = Number.isFinite(data?.typicalPct) && data.typicalPct < 0 ? 'bearish' : 'bullish';
  const low = Number.isFinite(data?.weaker) ? data.weaker * scale : null;
  const mid = Number.isFinite(data?.typical) ? data.typical * scale : null;
  const high = Number.isFinite(data?.stronger) ? data.stronger * scale : null;
  const span = Number.isFinite(low) && Number.isFinite(high) ? high - low : 0;
  const midPct = span > 0 && Number.isFinite(mid)
    ? Math.min(96, Math.max(4, ((mid - low) / span) * 100))
    : 50;
  const yearLabel = `${years} year${years === 1 ? '' : 's'}`;

  return (
    <div className="outlookBoard" data-guide="outlook-panel">
      <header className="conditionBoardHead">
        <div>
          <h3>
            A possible range{' '}
            <HelpHint label="What is this range?" text={hint} />
          </h3>
          <p className="subtle">
            {title}. Three pictures if the past mix of daily moves carried on. Not a promise.
          </p>
        </div>
        <span className="tag muted">{yearLabel}</span>
      </header>

      <div className="timeframeBar outlookHorizons">
        {HORIZONS.map((item) => (
          <button
            key={item.years}
            type="button"
            className={item.years === years ? 'tfBtn active' : 'tfBtn'}
            onClick={() => onYears(item.years)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && <p className="subtle outlookLoading">Drawing the {years}-year range…</p>}
      {error && <p className="warn">{error}</p>}

      {data?.ok && (
        <div className="outlookReveal" key={`${years}-${data.lookbackEnd}-${data.typical}`}>
          <div className="conditionBoardStats">
            <article className="conditionStat outlookCard">
              <span>Weaker</span>
              <strong className="isDown">{formatPrice(low)}</strong>
              <p>{formatPct(data.weakerPct)} from the latest close. The low end of this picture. About 1 in 10 paths land here or lower.</p>
            </article>
            <article className={`conditionStat outlookCard conditionStat--${tone}`}>
              <span>Typical</span>
              <strong className={data.typicalPct >= 0 ? 'isUp' : 'isDown'}>
                {formatPrice(mid)}
              </strong>
              <p>{formatPct(data.typicalPct)} from the latest close. The typical path, if each day keeps the same kind of move as before.</p>
            </article>
            <article className="conditionStat outlookCard">
              <span>Stronger</span>
              <strong className="isUp">{formatPrice(high)}</strong>
              <p>{formatPct(data.strongerPct)} from the latest close. The high end of this picture. About 1 in 10 paths land here or higher.</p>
            </article>
          </div>
          <div className="outlookSpan" aria-hidden="true">
            <div className="outlookTrack">
              <span className="outlookTrackFill" />
              <i className="outlookTrackMark" style={{ left: `${midPct}%` }} />
            </div>
            <div className="outlookTrackCaps">
              <span>Weaker</span>
              <span className="outlookTrackMid" style={{ left: `${midPct}%` }}>Typical</span>
              <span>Stronger</span>
            </div>
          </div>
          <p className="subtle outlookFoot">{historyLine(data)} A picture to think with, not advice and not one exact future price.</p>
          <p className="subtle outlookFoot">
            This picture can be wrong. It only replays past daily moves, as if that mix carries on.
            It does not know investor mood, the wider economy, this business’s own market,
            or whether the business grows, improves, or gets worse from here.
          </p>
        </div>
      )}
    </div>
  );
}
