import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BROKERS, GLOSSARY, LESSONS } from '../lib/guideContent';
import { useGuide } from '../lib/guide';

function matches(query, ...parts) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => String(part || '').toLowerCase().includes(needle));
}

const PATH = [
  { n: '1', title: 'Find a name', text: 'Search a ticker, or pick one from Stocks, Crypto, or NGX.', to: '/stocks', label: 'Open Stocks' },
  { n: '2', title: 'Read the line', text: 'Time runs across. Price runs up. The line is the close.', to: '/stocks', label: 'See a chart' },
  { n: '3', title: 'Ask if you can sell', text: 'A price on screen does not mean a buyer is waiting.', to: '/ngx', label: 'Open NGX' },
  { n: '4', title: 'Look at a range', text: 'Weaker, typical, and stronger are a picture, not a promise.', to: '/forecast', label: 'Open Forecast' },
];

function PriceScene() {
  return (
    <div className="learnScene learnScene--price" aria-hidden="true">
      <span className="learnSceneTag">Example, not a live price</span>
      <div className="learnPriceRow">
        <strong>₦100</strong>
        <i>to</i>
        <strong className="isUp">₦110</strong>
        <em>+10%</em>
      </div>
    </div>
  );
}

function ChartScene() {
  return (
    <div className="learnScene" aria-hidden="true">
      <span className="learnSceneTag">Time across, price up</span>
      <svg className="learnSpark" viewBox="0 0 280 88">
        <path d="M8 68 C36 66 48 36 78 44 S128 76 158 48 S214 16 272 26" />
        <circle cx="272" cy="26" r="4" />
      </svg>
    </div>
  );
}

function PercentScene() {
  return (
    <div className="learnScene" aria-hidden="true">
      <span className="learnSceneTag">Same money, two percentages</span>
      <div className="learnBars">
        <div><span style={{ width: '72%' }} /><small>₦100 → ₦110 is +10%</small></div>
        <div><span className="isDown" style={{ width: '64%' }} /><small>₦110 → ₦100 is about −9%</small></div>
      </div>
    </div>
  );
}

function IndicatorScene() {
  return (
    <div className="learnScene" aria-hidden="true">
      <span className="learnSceneTag">Price, and a smoother average</span>
      <svg className="learnSpark learnSpark--dual" viewBox="0 0 280 88">
        <path className="isAvg" d="M8 62 C70 58 140 40 272 34" />
        <path d="M8 70 C40 48 58 74 90 50 S140 28 170 46 S220 62 272 30" />
      </svg>
    </div>
  );
}

function ForecastScene() {
  return (
    <div className="learnScene learnScene--range" aria-hidden="true">
      <span className="learnSceneTag">Three pictures, one history</span>
      <div className="learnRange">
        <article><span>Weaker</span><strong className="isDown">Low end</strong></article>
        <article className="isMid"><span>Typical</span><strong>Usual path</strong></article>
        <article><span>Stronger</span><strong className="isUp">High end</strong></article>
      </div>
    </div>
  );
}

function EarningsScene() {
  return (
    <div className="learnScene" aria-hidden="true">
      <span className="learnSceneTag">Example report, not a real company</span>
      <div className="learnStack">
        <div><span>Sales</span><strong>₦100</strong></div>
        <div><span>Left after costs</span><strong>₦20</strong></div>
        <div><span>Per share</span><strong>₦2</strong></div>
      </div>
    </div>
  );
}

function CapScene() {
  return (
    <div className="learnScene" aria-hidden="true">
      <span className="learnSceneTag">Example. The cheaper share can be the bigger company</span>
      <div className="learnRange learnRange--pair">
        <article>
          <span>₦1,000 a share</span>
          <strong>1 million shares</strong>
          <small>About ₦1 billion</small>
        </article>
        <article className="isMid">
          <span>₦10 a share</span>
          <strong>1 billion shares</strong>
          <small>About ₦10 billion</small>
        </article>
      </div>
    </div>
  );
}

function StrengthScene() {
  return (
    <div className="learnScene" aria-hidden="true">
      <span className="learnSceneTag">Questions, not a score</span>
      <div className="learnStack">
        <div><span>1</span><strong>Does it keep a profit?</strong></div>
        <div><span>2</span><strong>Is that higher than last year?</strong></div>
        <div><span>3</span><strong>Can you sell a normal amount?</strong></div>
      </div>
    </div>
  );
}

function UnusualScene() {
  return (
    <div className="learnScene" aria-hidden="true">
      <span className="learnSceneTag">Two ways to say “this day stood out”</span>
      <svg className="learnSpark" viewBox="0 0 280 88">
        <path d="M8 60 C40 58 70 62 100 50 S150 18 176 22 S230 64 272 58" />
        <circle className="isGold" cx="176" cy="22" r="7" />
        <circle className="isWine" cx="100" cy="50" r="5" />
      </svg>
    </div>
  );
}

function LiquidityScene() {
  return (
    <div className="learnScene learnScene--tags" aria-hidden="true">
      <span className="learnTag learnTag--red">Hard to sell</span>
      <span className="learnTag learnTag--amber">Slow to sell</span>
      <span className="learnTag learnTag--ok">Easy to sell</span>
    </div>
  );
}

function NairaScene() {
  return (
    <div className="learnScene learnScene--money" aria-hidden="true">
      <span className="learnSceneTag">Same idea, two currencies</span>
      <div className="learnMoney">
        <strong>$</strong>
        <i>US stocks</i>
      </div>
      <div className="learnMoney">
        <strong>₦</strong>
        <i>NGX stocks</i>
      </div>
    </div>
  );
}

function RiskScene() {
  return (
    <div className="learnScene learnScene--steps" aria-hidden="true">
      <div><b>1</b><span>Read it here</span></div>
      <div><b>2</b><span>Order at a broker</span></div>
    </div>
  );
}

const SCENES = {
  'what-is-a-stock': PriceScene,
  'reading-a-chart': ChartScene,
  percentages: PercentScene,
  'earnings-report': EarningsScene,
  'market-cap': CapScene,
  'strong-company': StrengthScene,
  indicators: IndicatorScene,
  'possible-performance': ForecastScene,
  'unusual-days': UnusualScene,
  liquidity: LiquidityScene,
  nigeria: NairaScene,
  risk: RiskScene,
};

export function LearnPage() {
  const { startTour } = useGuide();
  const [query, setQuery] = useState('');
  const [openLesson, setOpenLesson] = useState(LESSONS[0]?.id || '');
  const [openTerm, setOpenTerm] = useState(GLOSSARY[0]?.term || '');

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
  const activeTerm = terms.find((entry) => entry.term === openTerm) || terms[0] || null;

  return (
    <main className="learnPage">
      <section className="learnHero" data-guide="learn-hero">
        <p className="welcomeLabel">New here</p>
        <h1>Learn the screen before you read a price.</h1>
        <p>
          Four short steps, then a lesson with a picture. Nexora organises research. It does not take an order or hold your money.
        </p>
        <div className="learnHeroActions">
          <button type="button" className="ctaPrimary" onClick={() => startTour(0)}>
            Walk me through
          </button>
          <Link to="/stocks" className="ctaSecondary">Open a chart</Link>
          <Link to="/forecast" className="ctaSecondary">Open Forecast</Link>
          <a href="#brokers" className="ctaSecondary">Licensed brokers</a>
        </div>
        <label className="learnSearch">
          Search a word
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="RSI, dividend, weaker, Stanbic…"
          />
        </label>
      </section>

      <section className="learnSection" aria-label="Start here">
        <header className="sectionHead">
          <div>
            <h2>Start here</h2>
            <p className="subtle">Follow these in order the first time. You can jump back whenever you want.</p>
          </div>
        </header>
        <ol className="learnPath">
          {PATH.map((step) => (
            <li key={step.n} className="learnPathCard" style={{ animationDelay: `${(Number(step.n) - 1) * 80}ms` }}>
              <span>{step.n}</span>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
              <Link to={step.to}>{step.label}</Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="learnSection">
        <header className="sectionHead">
          <div>
            <h2>Lessons</h2>
            <p className="subtle">Open one. The picture comes first, then the words.</p>
          </div>
        </header>
        {lessons.length === 0 ? (
          <p className="subtle">No lesson matches that search. Try “close”, “volume”, or “RSI”.</p>
        ) : (
          <div className="learnLessons">
            {lessons.map((lesson, index) => {
              const open = openLesson === lesson.id;
              const Scene = SCENES[lesson.id];
              return (
                <article key={lesson.id} className={open ? 'learnLesson isOpen' : 'learnLesson'}>
                  <button
                    type="button"
                    className="learnLessonHead"
                    aria-expanded={open}
                    onClick={() => setOpenLesson(open ? '' : lesson.id)}
                  >
                    <i aria-hidden="true">{String(index + 1).padStart(2, '0')}</i>
                    <span>
                      <strong>{lesson.title}</strong>
                      <small>{lesson.summary}</small>
                    </span>
                    <b aria-hidden="true">{open ? '−' : '+'}</b>
                  </button>
                  <div className="learnLessonBody" aria-hidden={!open} inert={!open}>
                    <div>
                      {Scene ? <Scene /> : null}
                      {lesson.body.map((paragraph) => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
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
              When you are ready to buy or sell, use a regulated firm. These are well-known dealing members and retail brokers — not a pick of what to buy.
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
                  {group.firms.map((firm, index) => (
                    <li key={firm.name} style={{ animationDelay: `${index * 60}ms` }}>
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
            <h2>Words on the screen</h2>
            <p className="subtle">Tap a word. One meaning shows at a time, so the list does not turn into a wall.</p>
          </div>
        </header>
        {terms.length === 0 ? (
          <p className="subtle">No word matches that search.</p>
        ) : (
          <>
            <div className="learnChips" role="list">
              {terms.map((entry) => {
                const active = activeTerm?.term === entry.term;
                return (
                  <button
                    key={entry.term}
                    type="button"
                    role="listitem"
                    className={active ? 'learnChip isActive' : 'learnChip'}
                    onClick={() => setOpenTerm(entry.term)}
                  >
                    {entry.term}
                  </button>
                );
              })}
            </div>
            {activeTerm && (
              <article className="learnTermStage" key={activeTerm.term}>
                <h3>{activeTerm.term}</h3>
                <p>{activeTerm.meaning}</p>
              </article>
            )}
          </>
        )}
      </section>

      <p className="learnFoot">
        Nexora does not take orders or hold funds. A listed broker is a place to send an order — confirm the current SEC Nigeria, NGX, SEC, or FINRA register before you send money. Nothing here is a recommendation to buy, sell, or hold.
      </p>
    </main>
  );
}
