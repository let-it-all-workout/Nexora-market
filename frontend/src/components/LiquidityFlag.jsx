import { useState } from 'react';
import { HelpHint } from './HelpHint';

export function LiquidityFlag({ reading, name }) {
  const [open, setOpen] = useState(false);
  if (!reading) return null;
  const tone = reading.tone || 'unknown';
  const who = name || 'this';

  return (
    <div className={`liquidityFlag liquidityFlag--${tone}`} data-guide="liquidity-flag">
      <header>
        <div>
          <p className="liquidityKicker">Can you sell {who}?</p>
          <h3>
            {reading.label}{' '}
            <HelpHint
              label="What does this mean?"
              text="The tag names the one factor that decided it: free float, demand, the bid–ask, a halt, or a corporate action. Settlement and market hours are shown too. They wait on every name, so they are not why one name is harder than another. A factor that says not published was not used."
            />
          </h3>
          {reading.reason ? <p className="liquidityReason">{reading.reason}{reading.marketClosed && reading.reason !== 'Market closed' ? ' · Market closed' : ''}</p> : null}
          <p className="liquidityLead">{reading.lead}</p>
        </div>
        <span className={`tag liquidityTag liquidityTag--${tone}`}>{reading.label}</span>
      </header>

      {reading.cards?.length > 0 && (
        <div className="liquidityCards">
          {reading.cards.map((item) => (
            <article key={item.key}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              {item.hint ? <p>{item.hint}</p> : null}
            </article>
          ))}
        </div>
      )}

      {reading.factors?.length > 0 && (
        <div className="liquidityCards liquidityFactors">
          {reading.factors.map((item) => (
            <article key={item.key} className={`liquidityFactor liquidityFactor--${item.tone || 'unknown'}${item.cause ? ' isCause' : ''}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              {item.hint ? <p>{item.hint}</p> : null}
            </article>
          ))}
        </div>
      )}

      {reading.notes?.length > 0 && (
        <ul className="liquidityFlagList">
          {reading.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      )}

      <p className="liquidityFoot">{reading.disclaimer}</p>

      <button type="button" className="liquidityMore" onClick={() => setOpen((value) => !value)}>
        {open ? 'Hide the simple version' : 'Say that more simply'}
      </button>
      {open && (
        <div className="liquiditySimple">
          <p><span className="tag liquidityTag liquidityTag--red">Hard to sell</span> names the factor: no demand, very low demand, low free float, a wide spread, suspended, or delisted.</p>
          <p><span className="tag liquidityTag liquidityTag--amber">Slow to sell</span> names a softer version of the same factors, usually low demand.</p>
          <p><span className="tag liquidityTag liquidityTag--ok">Easy to sell</span> means demand is there. The reason says that.</p>
          <p>Settlement and a closed market apply to the whole list. They are tagged on their own row. A blank factor stays “not published” and is not used as the reason.</p>
        </div>
      )}
    </div>
  );
}
