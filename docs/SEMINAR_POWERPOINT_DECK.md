# Seminar PowerPoint Blueprint

## Title

**The Effect of a Market Visualizer on Nigerian Investors: Design, Implementation, and Simulation-Based Evaluation**

Keep that wording if it was already approved. On the methodology and findings slides, say clearly: **the live prototype does not run a trading simulator**. Evaluation is artifact demonstration plus **Isolation Forest versus a 3-sigma baseline** for unusual days.

## Purpose of the Deck

Present a **computer-science artifact** with Nigerian relevance: a small visualizer so beginners can see history, indicators, and unusual days from named sources — not a nationwide impact study and not a broker.

Safest message:

The visualizer is designed to make market history easier to read for Nigerian-oriented beginners (NGX in naira, USD→NGN bar). Unusual days are flagged two ways so a student can compare a statistical rule with a machine-learning detector. That is detection on the chart in front of you, not a forecast.

## Core Rules

- Keep **NGX and beginner Nigerian investors** as the local lens.
- Stocks and crypto are supporting breadth.
- Do **not** mention DeFi yields, commodities, Monte Carlo wealth paths, or an AI chart explainer as if they are in the demo.
- Use phrases like: `the prototype is designed to`, `the detector flags`, `the system may help`.
- Do not say: `the app improved Nigerians`, `Isolation Forest predicts tomorrow`, `the gold ring is a buy signal`.

## Deck Structure (15 slides)

1. Title
2. Presentation Overview
3. Abstract
4. Introduction
5. Problem Statement
6. Aim and Objectives
7. Scope of Study
8. Literature Review
9. Methodology
10. System Design and Workflow
11. Findings and Results
12. Discussion
13. Conclusion
14. Recommendations
15. References

## Slide-by-Slide Content

### Slide 1 — Title

Approved title, name, matric number, department, university, session, supervisor, date.

### Slide 2 — Presentation Overview

Background, problem, aim, literature, method, system, findings, discussion, conclusion.

### Slide 3 — Abstract

Motivation, problem, aim, method (design-science + detector comparison), findings (working visualizer; IF vs 3-sigma), conclusion (prototype, not a field study).

### Slide 4 — Introduction

Beginners can see prices but struggle to interpret trend, volatility, and “was this day unusual?” Nigerian users also need NGX in naira and a simple FX context.

### Slide 5 — Problem Statement

- Many tools dump charts without a testable overlay.
- NGX-centered views are weaker than US-ticker tools.
- “Unusual” is often claimed without a named method.
- Need an **honest** visualizer: empty chart if the provider has no history.

### Slide 6 — Aim and Objectives

Aim: design and implement a market visualizer that may improve how Nigerian-oriented beginners read market history.

Objectives (example):

1. Implement Stocks, Crypto, and NGX workspaces on one chart stack.
2. Compute SMA, EMA, RSI, MACD, and Bollinger bands with tests.
3. Flag unusual days with Isolation Forest and a 3-sigma baseline.
4. Show USD→NGN for local context.
5. State data sources and refuse invented history.

### Slide 7 — Scope of Study

Included: stocks, crypto, NGX, indicators, compare-two-stocks, local watchlist, unusual-day flags, USD→NGN bar.

Not included: brokerage, personal advice, next-day forecast, DeFi/commodities pages, Monte Carlo simulation, AI chatbot.

### Slide 8 — Literature Review

Market visualization; financial literacy; decision support; anomaly detection (Isolation Forest); Nigerian market access.

### Slide 9 — Methodology

Design-science / software engineering. React + Vite frontend, Express backend, Recharts. Data: Yahoo Finance, CoinGecko, NGX Pulse, FX APIs. Evaluation: implementation evidence, screenshots, unit tests, Isolation Forest vs 3-sigma on the same series.

### Slide 10 — System Design and Workflow

User flow: pick a market → search ticker → load history or see empty → overlay indicators → optional compare → click gold/wine marks. Screenshots here.

### Slide 11 — Findings and Results

- Working demo: Home, Stocks, Crypto, NGX.
- Named providers; empty chart if no bars.
- Gold = 3-sigma on return or volume; wine = Isolation Forest (top 5% score and floor 0.55).
- USD→NGN bar for naira context.

### Slide 12 — Discussion

Clearer charts and named methods may help beginners. NGX + FX is the local angle. Isolation Forest is **not** a trading model. Effect on Nigerians is inferred from design, not measured in a survey.

### Slide 13 — Conclusion

Technical aim achieved as a prototype. Potential value for Nigerian-oriented beginners. No claim of national impact.

### Slide 14 — Recommendations

User testing with Nigerian students; stronger NGX history coverage; signup/watchlist sync later; keep refusing forecasts.

### Slide 15 — References

APA 7, brief on the slide; full list in the report. Include Liu, Ting, and Zhou (2008) for Isolation Forest.

## Suggested Screenshots

1. Home
2. Stocks with indicators and gold/wine marks
3. Compare two stocks
4. NGX + USD→NGN bar

## Rebuild the .pptx

From `m&s`:

```bash
.venv-pptx/bin/python docs/build_seminar_ppt.py
```

That writes `docs/Defence_Deck_Report_Format.pptx`. Put screenshots in `docs/screenshots/` as `home.png`, `stock.png`, `crypto.png`, `ngx.png`. Do not run the old `patch_*.py` scripts.

## Delivery Advice

10–15 minutes. Spend time on the problem, honest data, and gold vs wine. If asked about “simulation” in the title: the earlier engine was removed; evaluation is now the detector comparison plus the working artifact.
