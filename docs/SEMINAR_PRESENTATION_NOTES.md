# Seminar Presentation Notes

Speak from this with the projector deck. Keep Isolation Forest as **detection**, not prediction.

## Slide 1 — Title

Good day everyone. My seminar topic is *The Effect of a Market Visualizer on Nigerian Investors: Design, Implementation, and Simulation-Based Evaluation*. I will show a working visualizer for stocks, crypto, and NGX, then explain how we mark unusual days with Isolation Forest versus a 3-sigma rule. The software is not a broker and does not forecast prices.

## Slide 2 — Presentation Overview

I will cover the problem for beginners, what we built, how data is fetched honestly, the detector comparison, limitations, and future work.

## Slide 3 — Abstract (spoken, short)

Beginners can open charts but still cannot tell what an average, RSI, or an unusual day means. This project implements a small visualizer with named sources. If a provider has no history, the chart stays empty. Unusual days get a gold ring (3-sigma) or a wine dot (Isolation Forest). That is the evaluation story in the live app.

## Slide 4 — Introduction

NGX prices sit in broker apps, exchange pages, and WhatsApp. US tickers are easier to chart. A student tool should put history, indicators, and local FX in one place without pretending to be advice.

## Slide 5 — Problem Statement

Scattered information, weak NGX tooling, charts without testable overlays, and “AI” claims that invent confidence. We needed an honest chart.

## Slide 6 — Aim and Objectives

Design and implement the visualizer; compute indicators with tests; flag unusual days two ways; keep NGX and USD→NGN as the Nigerian lens.

## Slide 7 — Scope

In: Stocks, Crypto, NGX, indicators, compare, watchlist, gold/wine flags, FX bar. Out: trading, forecasts, DeFi/commodities pages, Monte Carlo, chatbot.

## Slide 8 — Literature

Visualization and literacy for why charts matter. Isolation Forest (Liu et al., 2008) for why isolation path length can mark outliers without labelling “buy.”

## Slide 9 — Methodology

React, Vite, Express, Recharts. Yahoo, CoinGecko, NGX Pulse, FX. Unit tests for indicators. Isolation Forest on four features compared with 3-sigma on the same chart.

## Slide 10 — System Design

Home → Stocks / Crypto / NGX. Search. Chart. Indicators. Compare two stocks from 0%. Click a mark to read the day. USD→NGN under the nav.

## Slide 11 — Findings

The artifact runs. Empty charts happen when APIs fail — that is correct behaviour. Gold and wine can both fire on the same bar. Neither is a signal.

## Slide 12 — Discussion

Potential effect is clearer reading of history, not measured trading profit. If the title still says “simulation-based,” explain that Monte Carlo was removed and the comparison is IF vs 3-sigma.

## Slide 13 — Conclusion

A working educational visualizer with a named ML detector and a statistical baseline. Prototype only.

## Slide 14 — Recommendations

User tests with Nigerian students; better NGX history; optional accounts later; never add next-day forecasts.

## If they ask “does Isolation Forest predict the market?”

No. It ranks how easy a bar is to isolate in feature space. High score means unusual versus this window, not “it will go up tomorrow.”
