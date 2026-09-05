import { HelpHint } from './HelpHint';

function readingCopy(condition) {
  if (condition === 'Bullish') return 'Most of these names closed higher.';
  if (condition === 'Bearish') return 'Most of these names closed lower.';
  return 'Split or little net move across this sample.';
}

function formatMove(value) {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function ConditionBoard({
  hint,
  rangeLabel,
  sampleLine,
  summary,
  names = [],
  extras = [],
  avgLabel = 'Average move',
  avgDetail = 'Mean change of the names in this sample.',
  readingDetail,
  onPick,
  fallbackNote,
  error,
  onRetry,
  children,
}) {
  const condition = summary?.condition || '—';
  const tone = String(summary?.condition || 'neutral').toLowerCase();
  const avg = summary?.avgChange;
  const up = Number.isFinite(avg) && avg > 0;
  const down = Number.isFinite(avg) && avg < 0;
  const advances = summary?.advances ?? 0;
  const declines = summary?.declines ?? 0;
  const total = Math.max(advances + declines, 1);

  return (
    <div className="conditionBoard">
      <header className="conditionBoardHead">
        <div>
          <h3>
            Market condition{' '}
            <HelpHint label="What is market condition?" text={hint} />
          </h3>
          <p className="subtle">{sampleLine}</p>
        </div>
        {rangeLabel && <span className="tag muted">{rangeLabel}</span>}
      </header>

      {fallbackNote && <p className="subtle conditionBoardNote">{fallbackNote}</p>}
      {error && (
        <p className="warn conditionBoardNote">
          {error}
          {onRetry && (
            <button type="button" className="tfBtn" onClick={onRetry}>Retry</button>
          )}
        </p>
      )}

      <div className="conditionBoardStats">
        <article className={`conditionStat conditionStat--${tone}`}>
          <span>Reading</span>
          <strong>{condition}</strong>
          <p>{summary ? (readingDetail || readingCopy(summary.condition)) : 'Waiting on the sample.'}</p>
        </article>
        <article className="conditionStat">
          <span>{avgLabel}</span>
          <strong className={up ? 'isUp' : down ? 'isDown' : ''}>
            {formatMove(avg)}
          </strong>
          <p>{avgDetail}</p>
        </article>
        <article className="conditionStat">
          <span>Up vs down</span>
          <strong className="conditionBreadthValue">
            <em className="isUp">{advances}</em>
            <span>higher</span>
            <em className="isDown">{declines}</em>
            <span>lower</span>
          </strong>
          <div className="conditionBreadth" aria-hidden="true">
            <i className="isUp" style={{ width: `${(advances / total) * 100}%` }} />
            <i className="isDown" style={{ width: `${(declines / total) * 100}%` }} />
          </div>
          <p>
            {summary
              ? `${advances} of these ${advances + declines} names closed higher. ${declines} closed lower.`
              : 'How many names in this sample closed higher versus lower.'}
          </p>
        </article>
      </div>

      {extras.length > 0 && (
        <div className="conditionBoardExtras">
          {extras.map((item) => (
            <article key={item.label} className="conditionStat conditionStat--extra">
              <span>{item.label}</span>
              <strong className="monoNum">{item.value}</strong>
              {item.detail && <p>{item.detail}</p>}
            </article>
          ))}
        </div>
      )}

      {names.length > 0 && (
        <ul className="conditionNames">
          {names.map((item) => {
            const move = item.changePct;
            const moveUp = Number.isFinite(move) && move > 0;
            const moveDown = Number.isFinite(move) && move < 0;
            const body = (
              <>
                <b>{item.label}</b>
                <span className={moveUp ? 'isUp' : moveDown ? 'isDown' : ''}>
                  {formatMove(move)}
                </span>
              </>
            );
            return (
              <li key={item.id}>
                {onPick ? (
                  <button type="button" onClick={() => onPick(item.id)}>{body}</button>
                ) : (
                  <span className="conditionNameStatic">{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {children}
    </div>
  );
}
