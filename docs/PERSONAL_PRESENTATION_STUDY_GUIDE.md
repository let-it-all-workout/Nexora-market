# Personal presentation study guide

Rehearse this before the seminar and viva. Full spoken script: [`VIVA_SCRIPT.md`](VIVA_SCRIPT.md).

## Approved title (if already signed off)

**The Effect of a Market Visualizer on Nigerian Investors: Design, Implementation, and Simulation-Based Evaluation**

If asked about “simulation”: the Monte Carlo engine was **removed**. Evaluation in the submitted app is **Isolation Forest versus a 3-sigma rule** on unusual days, plus a working visualizer.

## Best overall message

Nigerian beginners can see prices but struggle to read history, averages, and whether a day was unusual. This visualizer plots **named-provider** history for stocks, crypto, and NGX, overlays **tested indicators**, and flags unusual bars two ways. USD→NGN sits in a small bar for local context. It is **not** a broker, **not** a forecast, **not** a chatbot.

## Problems I am solving

1. Information is scattered.
2. NGX context is weaker than US-ticker tools.
3. Charts are shown without a method you can examine.
4. “Unusual” is often claimed without a baseline.

## Alpha points

1. Honest empty chart if the provider has no bars.
2. SMA / EMA / RSI / MACD / Bollinger computed and tested in the backend.
3. Gold ring = 3-sigma; wine = Isolation Forest; detection only.
4. NGX in naira + USD→NGN bar.
5. Compare two stocks from 0%; watchlist in the browser.

## Never say

- All Nigerians improved.
- Isolation Forest predicts NGX.
- Gold/wine is a buy or sell.
- DeFi, commodities, or the old simulator are in the demo.

## 30-second opening

Good day. This work is a market visualizer for beginners, with NGX and naira FX as the Nigerian lens. You search a ticker; we plot real history or leave the chart empty. Indicators are computed here. Unusual days are marked with Isolation Forest and a 3-sigma baseline. That is the system I will demonstrate.

## Demo order

Home → Stocks (indicators + a gold/wine click) → compare two names → NGX → point at USD→NGN.
