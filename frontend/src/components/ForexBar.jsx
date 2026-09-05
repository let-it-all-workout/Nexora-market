import { useCallback, useEffect, useState } from 'react';
import { fetchFx } from '../lib/api';

const SOURCE_LABELS = {
  'open-er-api': 'Open ER',
  'exchangerate-host': 'exchangerate.host',
};

function formatRate(rate) {
  return `₦${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTime(iso) {
  const date = new Date(iso || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function ForexBar() {
  const [status, setStatus] = useState('loading');
  const [rate, setRate] = useState(null);
  const [source, setSource] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await fetchFx();
      const next = Number(data?.rate);
      if (!Number.isFinite(next)) {
        setStatus('empty');
        return;
      }
      setRate(next);
      setSource(data?.provenance?.source || '');
      setUpdatedAt(formatTime(data?.asOf));
      setStatus('ok');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 5 * 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const isLive = status === 'ok';
  const sourceLabel = SOURCE_LABELS[source] || source;

  return (
    <section className="fxStrip" aria-label="US dollar to naira exchange rate" data-guide="fx-strip">
      <div className="fxStripInner">
        <div className="fxStripMain">
          <span className={isLive ? 'fxTag' : 'fxTag fxTag--muted'}>
            <i className="fxDot" aria-hidden="true" />
            USD <span aria-hidden="true">→</span> NGN
          </span>
          <span className="fxValue" aria-live="polite">
            {status === 'loading' && <span className="fxSkeleton" aria-label="Loading rate" />}
            {isLive && <strong className="fxRate">{formatRate(rate)}</strong>}
            {status === 'empty' && <span className="fxUnavailable">Rate unavailable</span>}
            {status === 'error' && <span className="fxUnavailable">Rate feed offline</span>}
          </span>
          {isLive && <span className="fxCurrency">per 1 US dollar</span>}
        </div>

        <div className="fxStripMeta">
          {isLive && sourceLabel && <span className="fxSource">{sourceLabel}</span>}
          {isLive && updatedAt && <span className="fxUpdated">Updated {updatedAt}</span>}
          {!isLive && status !== 'loading' && <span className="fxUpdated">Tap retry to check again</span>}
          <button
            type="button"
            className={busy ? 'fxRefresh isBusy' : 'fxRefresh'}
            onClick={load}
            disabled={busy}
            title={isLive ? 'Refresh rate' : 'Retry'}
            aria-label={isLive ? 'Refresh exchange rate' : 'Retry exchange rate'}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path
                d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
