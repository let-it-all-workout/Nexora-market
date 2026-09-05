import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BROKERS, GLOSSARY, LESSONS } from '../lib/guideContent';
import { useGuide } from '../lib/guide';

function matches(query, ...parts) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => String(part || '').toLowerCase().includes(needle));
}

export function LearnPage() {
  const { startTour } = useGuide();
  const [query, setQuery] = useState('');
  const [openLesson, setOpenLesson] = useState(LESSONS[0]?.id || '');

  const lessons = useMemo(
    () => LESSONS.filter((lesson) => matches(query, lesson.title, lesson.summary, ...(lesson.body || []))),
    [query],
  );
  const terms = useMemo(
    () => GLOSSARY.filter((entry) => matches(query, entry.term, entry.meaning)),
    [query],
  );
  const brokerGroups = useMemo(
    () => BROKERS.map((group) => ({
      ...group,
      firms: group.firms.filter((firm) => matches(query, firm.name, firm.focus, group.region, group.note)),
    })).filter((group) => !query.trim() || group.firms.length > 0),
    [query],
  );

  return (
    <main className="learnPage">
      <section className="learnHero" data-guide="learn-hero">
        <p className="welcomeLabel">Reference</p>
        <h1>Price terms, methods, and licensed brokers.</h1>
        <p>
          This page collects the labels used on the charts — close, volume, RSI, unusual-day marks — and the licensed firms that can send an order to the exchange. Nexora organises research. It does not execute trades.
        </p>
        <div className="learnHeroActions">
          <button type="button" className="ctaPrimary" onClick={() => startTour(0)}>
            Workspace tour
          </button>
          <Link to="/stocks" className="ctaSecondary">Open a chart</Link>
          <a href="#brokers" className="ctaSecondary">Licensed brokers</a>
        </div>
        <label className="learnSearch">
          Search terms, lessons, or brokers
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="RSI, dividend, Stanbic, Interactive Brokers…"
          />
        </label>
      </section>

      <section className="learnSection">
        <header className="sectionHead">
          <div>
            <h2>How to read a listing</h2>
            <p className="subtle">Short notes on the fields and overlays used in this workspace.</p>
          </div>
        </header>
        {lessons.length === 0 ? (
          <p className="subtle">No lesson matches that search. Try “close”, “volume”, or “RSI”.</p>
        ) : (
          <div className="learnLessons">
            {lessons.map((lesson) => {
              const open = openLesson === lesson.id;
              return (
                <article key={lesson.id} className={open ? 'learnLesson isOpen' : 'learnLesson'}>
                  <button
                    type="button"
                    className="learnLessonHead"
                    aria-expanded={open}
                    onClick={() => setOpenLesson(open ? '' : lesson.id)}
                  >
                    <span>
                      <strong>{lesson.title}</strong>
                      <small>{lesson.summary}</small>
                    </span>
                    <b aria-hidden="true">{open ? '−' : '+'}</b>
                  </button>
                  {open && (
                    <div className="learnLessonBody">
                      {lesson.body.map((paragraph) => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="learnSection" id="brokers">
        <header className="sectionHead">
          <div>
            <h2>Licensed brokers</h2>
            <p className="subtle">
              Use a regulated firm to place an order. These are well-known dealing members and retail brokers — not affiliates, and not a pick of what to buy.
            </p>
          </div>
        </header>
        {brokerGroups.length === 0 ? (
          <p className="subtle">No broker matches that search.</p>
        ) : (
          <div className="learnBrokerGroups">
            {brokerGroups.map((group) => (
              <div key={group.region} className="learnBrokerGroup">
                <h3>{group.region}</h3>
                <p className="subtle">{group.note}</p>
                <ul className="learnBrokerGrid">
                  {group.firms.map((firm) => (
                    <li key={firm.name}>
                      <a
                        className="learnBrokerCard"
                        href={firm.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <strong>{firm.name}</strong>
                        <span>{firm.focus}</span>
                        <em>Open site ↗</em>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="learnSection">
        <header className="sectionHead">
          <div>
            <h2>Glossary</h2>
            <p className="subtle">{terms.length} {terms.length === 1 ? 'term' : 'terms'}{query.trim() ? ' matching your search' : ''}.</p>
          </div>
        </header>
        {terms.length === 0 ? (
          <p className="subtle">No term matches that search.</p>
        ) : (
          <dl className="learnGlossary">
            {terms.map((entry) => (
              <div key={entry.term} className="learnTerm">
                <dt>{entry.term}</dt>
                <dd>{entry.meaning}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <p className="learnFoot">
        Nexora does not take orders or hold funds. A listed broker is an execution venue — confirm the current SEC Nigeria, NGX, SEC, or FINRA register before you send money. Nothing here is a recommendation to buy, sell, or hold a security.
      </p>
    </main>
  );
}
