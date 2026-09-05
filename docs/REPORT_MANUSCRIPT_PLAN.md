# Seminar Report Manuscript Map

## Topic

**Official / possibly approved title:** *The Effect of a Market Visualizer on Nigerian Investors: Design, Implementation, and Simulation-Based Evaluation*

If that title was already signed off, keep it on the cover page. In the body, be explicit that **the submitted software does not include a Monte Carlo simulator**. Evaluation in the live app is:

- **design and implementation** of the visualizer
- **case-based walkthroughs** (Stocks, Crypto, NGX)
- **Isolation Forest vs a 3-sigma rule** for unusual-day flags (detection only)

If the supervisor allows a title change, a closer match is: *Design and Implementation of a Market Visualizer for Nigerian-Oriented Beginners*.

## Main Narrative

The report should argue that the platform may improve:

- access to understandable market **history** (named providers only)
- local-market orientation through **NGX** and a **USD→NGN** rate bar
- beginner interpretation of charts via **tested indicators** and **unusual-day marks**

It should not argue that:

- the project measured the behaviour of Nigerian investors in the field
- Isolation Forest predicts the next day or gives a buy/sell signal
- an empty chart is a failure of the student rather than missing provider data

## Report Structure

1. Preliminary pages
2. Abstract
3. Introduction
4. Literature Review
5. Methodology
6. Findings / Results
7. Discussion
8. Conclusion
9. References

## Suggested Page Budget

| Section | Suggested length |
|--------|------------------|
| Abstract | 1 page max |
| Introduction | 2 to 3 pages |
| Literature Review | 3 to 4 pages |
| Methodology | 2 to 3 pages |
| Findings / Results | 3 to 4 pages |
| Discussion | 2 to 3 pages |
| Conclusion | 1 to 2 pages |
| References | as needed |

## Screenshot Plan

Use the same screenshots in the report and PowerPoint.

| Figure | What to capture | Route |
|--------|------------------|-------|
| Figure 1 | Home page (three markets, Isolation Forest vs 3-sigma copy) | `/` |
| Figure 2 | Stocks: search, chart, SMA/RSI, gold/wine marks | `/stocks` |
| Figure 3 | Compare two stocks from a common start (0%) | `/stocks` |
| Figure 4 | NGX page in naira, plus the USD→NGN bar | `/ngx` |
| Figure 5 | Crypto chart (and empty-chart state if you can capture it) | `/crypto` |

Do **not** screenshot DeFi, commodities, simulation, or a chart chatbot — those routes were removed.

## Findings Section Plan

### Case A — System orientation

- home page workflow
- named sources in the Trust Center
- USD→NGN bar as local context

### Case B — Stocks workflow

- search a ticker
- honest empty chart if history is missing
- SMA / EMA / RSI / MACD / Bollinger
- compare two symbols from 0%
- browser watchlist

### Case C — NGX workflow

- quotes in naira
- history only when NGX Pulse returns it
- why this matters for Nigerian beginners

### Case D — Unusual-day evaluation (the ML)

- gold ring = 3-sigma on return or volume on **this chart**
- wine dot = Isolation Forest on return, |return|, volume vs 20-day median, high–low/close
- both can fire; neither is a forecast or advice

## Consistency Checks

Before submission, verify that:

- cover-page title matches whatever the supervisor approved
- the **software description** matches Home / Stocks / Crypto / NGX (not `/analytics` or `/defi`)
- every “effect” claim is phrased as likely, designed, or potential
- Isolation Forest is described as **anomaly detection**, not prediction
- limitations include free-API gaps, no user study, and no brokerage
- references are APA 7
