# Defence study guide (slide by slide)

**Onwurah Ebube Michael — 2022/CSC/018**

**The Effect of a Market Visualizer on Nigerian Investors: Design, Implementation, and Simulation-Based Evaluation**

Supervisor: Dr Nwachukwu Nwosu

Use this with `Defence_Presentation.pptx` (15 slides). For each slide: what is on screen, what to say, and what not to invent.

---

## Two-minute opening (before Slide 1, or on Slide 1)

Good day. My name is Onwurah Ebube Michael, matriculation number 2022/CSC/018. My supervisor is Dr Nwachukwu Nwosu.

This project is a market visualizer for beginners, with the Nigerian Exchange in naira as the local focus. The problem is not access alone. A beginner can see a price and still misread it. They compare the share price instead of the size of the company, and they can buy a share that is hard to sell.

Nexora Markets puts NGX shares and United States shares in one website. It explains the chart in plain language. It marks unusual days in two ways: a three-sigma rule and an Isolation Forest model. It warns when a normal sale would be a large part of the day's trade. And it draws a weaker, typical, and stronger price from that listing's own past daily moves. That range is a model of the past, not a promise.

I did not study real investors, because the time was limited. The evaluation is the model, the automated tests, and the working screens. The system does not place trades and it is not advice.

I will now walk through the slides and the screens.

---

## Slide 1 — Title

**On screen:** Project defence, full title, your name, 2022/CSC/018, supervisor, October 2026, app previews on the right.

**Say:** Introduce yourself, the title, and Dr Nwachukwu Nwosu. One line: this is a reading tool for beginners, with NGX in naira — not a broker.

**If asked “simulation-based evaluation” already:** it means the modelled weaker / typical / stronger range, plus tests and live screens — not a human investor study.

---

## Slide 2 — Outline (Defence structure)

**On screen:** five blocks — Context, Purpose, System, Evidence, Close.

**Say:** Briefly name the five blocks. Do not expand yet.

1. Context — background and problem  
2. Purpose — aim and objectives  
3. System — modules and architecture  
4. Evidence — demo, tests, modelled range  
5. Close — limits and recommendations  

---

## Slide 3 — Problem (Six barriers)

**On screen:** six cards. Pause on market capitalisation and liquidity trap.

**Say each barrier in your own words:**

1. **Fragmented sources** — prices, news and FX sit on different sites.  
2. **Foreign-first tools** — weak NGX coverage; little naira context.  
3. **Unexplained charts** — indicators appear without plain guidance.  
4. **Price mistaken for size** — people compare share price, not market capitalisation (price × shares). A ₦10 share is not “cheaper” than a ₦1,000 share in any useful sense.  
5. **Liquidity trap** — thin listings can be hard to exit at a fair price.  
6. **Single-number targets** — social media sells one future price; an honest picture is a range.

---

## Slide 4 — Aim (Purpose of the study)

**On screen:** aim paragraph + six objective cards.

**Aim (memorise the idea):** Design and implement a web-based market visualizer that helps Nigerian-oriented beginners read NGX and US equity data, then evaluate it through modelling, automated tests and demonstration.

**Objectives (name them):**

1. Integrate markets — NGX in naira alongside US stocks and live USD/NGN rates  
2. Explain charts — indicators + dual unusual-day detectors  
3. Warn on liquidity — hard / slow / easy; no invented facts  
4. Model a range — weaker / typical / stronger  
5. Teach in-app — market cap, earnings, glossary  
6. Secure accounts — Supabase auth + private watchlist  

**Stress:** reading support, not brokerage.

---

## Slide 5 — System (Nexora Markets modules)

**On screen:** Home, NGX (Nigeria), US Stocks, Liquidity Board, Forecast, Learn & Watchlist.

**Say one line each:**

- **Home** — tour, overview, USD/NGN  
- **NGX (Nigeria)** — Nigerian shares in naira, All-Share Index, company pages  
- **US Stocks** — US stock charts, unusual-day flags, compare tool  
- **Liquidity Board** — ranks listings Easy, Slow, or Hard to sell  
- **Forecast** — weaker / typical / stronger  
- **Learn & Watchlist** — lessons, glossary, and private watchlists  

Then say you will demo the live screens next.

---

## Slide 6 — Architecture (Three-tier design)

**On screen:** presentation / application / market data / Supabase diagram; design-choice boxes.

**Say:**

- Browser (React / Vite) draws; server (Node.js / Express) computes.  
- Named providers: NGX Pulse, Yahoo Finance, and FX APIs.  
- No invented candles — empty history stays empty.  
- Watchlists protected so each user sees only their own list.  
- API keys stay hidden on the server.

**Sources table (if asked):**

| Market | Source |
|---|---|
| NGX | NGX Pulse |
| United States shares | Yahoo Finance |
| Dollar to naira | Public FX services |
| Accounts / watchlist | Supabase (PostgreSQL) |

---

## Slide 7 — Demo: Home interface

**On screen:** Home screenshot + four numbered boxes.

**Do / say:**

1. Point at primary navigation.  
2. Point at USD/NGN context bar.  
3. Mention guided tour entry.  
4. State clearly: no order placement here.

---

## Slide 8 — Demo: Unusual-day markers

**On screen:** stock chart (e.g. AAPL) with gold and wine marks.

**Do / say:**

1. Gold = 3-sigma rule.  
2. Wine = Isolation Forest.  
3. Same series, two methods.  
4. Diagnostic only — not buy or sell.

---

## Slide 9 — Methods: Two views of an unusual day

**On screen:** 3-sigma vs Isolation Forest panels.

**3-sigma (gold):**

- Simple statistical baseline  
- Flags return or volume more than 3σ from usual  
- Easy for an examiner to check  
- Not a buy or sell signal  

**Isolation Forest (wine):**

- Machine-learning detector  
- Uses return, size of return, volume vs recent typical, day’s high–low range  
- Flagged when score is in the top 5% and at least 0.55  
- Shown side-by-side with 3σ  

**One-liner:** Where they agree, the day really was unusual for that listing; where they differ, you can see the methods disagree.

---

## Slide 10 — Demo: Forecast range

**On screen:** Forecast screenshot; weaker / typical / stronger.

**How the range works (say slowly):**

- Needs at least 252 daily closes (about one trading year).  
- Uses that listing’s own past daily moves (lognormal projection).  
- **Typical** = middle path.  
- **Weaker** ≈ low picture (about 1 in 10 paths here or lower).  
- **Stronger** ≈ high picture (about 1 in 10 paths here or higher).  
- Band widens with time — not a promise.

**AAPL example to memorise** (latest close about $333.69; 2,511 daily closes, 6 Oct 2016 – 2 Oct 2026):

| Years | Weaker | Typical | Stronger |
|---|---|---|---|
| 1 | $294 (−12%) | $427 (+28%) | $621 (+86%) |
| 3 | $367 (+10%) | $700 (+110%) | $1,337 (+301%) |

**NGX note:** free Pulse plan may return only about the last seven sessions — page says not enough history; system does not invent a range.

---

## Slide 11 — Demo: NGX liquidity board

**On screen:** NGX liquidity table with hard / slow / easy tags.

**Do / say:**

1. Prices in naira.  
2. Hard / slow / easy tags.  
3. Normal-sale benchmark (e.g. ₦500,000 on NGX; $2,000 US stock in the app’s rules).  
4. Missing facts show as **Not stated** — never invent free float or holders.

**Liquidity trap (your definition):** you buy a thin share and then cannot sell it easily at a fair price. (Not the interest-rate economics term.)

**Market capitalisation:** answers “how big is the company?” Share price answers “what does one unit cost?” Learn teaches this.

---

## Slide 12 — Evaluation: Technical evidence

**On screen:** 57 tests · 6 modules · 3σ + IF · 1–5y horizons; AAPL range boxes; simulation-based evaluation boxes.

**Say:**

- 57 automated backend tests (indicators, unusual days, liquidity, NGX facts, range maths).  
- Six application modules.  
- Dual detectors and 1–5 year horizons.  
- Evaluation = modelled range + automated tests + live screen verification.  
- No human-subject study (limited time).

**Do not claim:** Nigerian investors were proven to improve.

---

## Slide 13 — Limitations

**On screen:** five limitation rows. State these before questions.

1. **No human study** — limited time; no survey or experiment.  
2. **Likely, not proven** — benefit inferred from design and tests.  
3. **Data constraints** — free NGX history may be short; system refuses to invent.  
4. **Model assumptions** — ranges replay past daily moves only.  
5. **Non-trading tool** — no orders, custody, or personal advice.

---

## Slide 14 — Conclusion and recommendations

**Conclusion:**

- One interface for NGX (in Naira) and US equities  
- Dual detectors, liquidity warnings, modelled ranges  
- In-app teaching of size versus price  
- Technical evaluation supports correctness under stated limits  

**Recommendations:**

- Controlled study with Nigerian beginners  
- Fuller NGX historical data where funded  
- Broader instructional content and languages  
- Keep refusing invented market facts  

---

## Slide 15 — Thank you

**Say:** Thank you. Questions are welcome. Stop talking. Wait for questions.

If they ask about simulation-based evaluation again: weaker / typical / stronger from past daily moves, plus tests and demo screens — not a human trial.

---

## Extra: live demo order (if you open the real app)

1. **Home** — menu + USD/NGN.  
2. **Stocks, Apple** — gold rings and wine dots; not buy signals.  
3. **Forecast, Apple, 1 year** — read weaker / typical / stronger; then 3 years (band wider); read the warning.  
4. **NGX** — e.g. DANGCEM; naira price, liquidity tag; if no range, explain short free history.  
5. **Liquidity board** — hard / slow / easy.  
6. **Learn** — size vs share price, or earnings lesson.

---

## Questions you may be asked

**What does simulation-based evaluation mean?**  
The possible range is a simulation of future prices from the past daily moves. Typical is the middle path. Weaker and stronger are the low and high pictures, about the outer 10% on each side. I also checked the maths with tests and with the live screens. I did not measure real investors.

**Why no questionnaire?**  
Limited time. One student, one academic session. So I do not claim the system has already changed how Nigerians invest.

**Is Isolation Forest a prediction?**  
No. It only marks days that look unusual compared with the other days on that chart.

**Why can the forecast be wrong?**  
It assumes the past mix of daily moves continues. It does not know mood, the economy, the company’s market, or whether the business improves or gets worse.

**Why do some NGX pages lack a long chart or a range?**  
The free NGX Pulse plan returns about the last seven sessions. Full history needs a paid plan. The page says “not enough history” instead of inventing prices.

**What is a liquidity trap here?**  
Not the interest-rate term. Here it means you buy a thin share and then cannot sell it easily at a fair price.

**Where is the database?**  
Supabase (PostgreSQL). The app’s own table is the watchlist. Accounts are in Supabase Auth. Each user can read and change only their own rows (RLS).

**What language did you use?**  
JavaScript. React in the browser. Node.js and Express on the server.

---

## Do not say these

- Do not say the system has been proven to make Nigerian investors better.  
- Do not say the gold ring or the wine dot means buy or sell.  
- Do not say the typical price will happen.  
- Do not invent a free float, a holder, or a listing method. If the screen says “Not stated”, say the source did not provide it.  
- Do not say you are a broker or that the site places orders.
