# Final-year project report — structure, checklist, and APA 7 guidance

Use this as the report-writing checklist. The **cover title** may still be the approved wording:

**The Effect of a Market Visualizer on Nigerian Investors: Design, Implementation, and Simulation-Based Evaluation**

The **software you are submitting** is a Nigerian-oriented **market visualizer** (Stocks, Crypto, NGX) with tested indicators and **Isolation Forest vs 3-sigma** unusual-day flags. It is **not** a Monte Carlo simulator, not a broker, and not a nationwide user study.

**Viva speaking notes:** [`VIVA_SCRIPT.md`](VIVA_SCRIPT.md)  
**Manuscript plan:** [`REPORT_MANUSCRIPT_PLAN.md`](REPORT_MANUSCRIPT_PLAN.md)  
**PowerPoint:** [`SEMINAR_POWERPOINT_DECK.md`](SEMINAR_POWERPOINT_DECK.md)  
**Older prose draft (stale on simulation/AI):** [`REPORT_BODY_DRAFT.md`](REPORT_BODY_DRAFT.md) — rewrite those sections before binding.  
**References starter:** [`REFERENCES_APA7.md`](REFERENCES_APA7.md)

## Core framing rules

- `effect on Nigerians` means likely effect on **accessibility and understanding** for Nigerian-oriented beginners (NGX + USD→NGN).
- Isolation Forest means **anomaly detection on the loaded chart**, not price forecasting.
- The seminar may argue that the system **may help** or **is designed to help**.
- Do not claim real-world investor outcomes were measured unless you ran a user study.
- If the title still says “simulation,” define evaluation as **artifact + detector comparison**, and state that the old simulator was removed.

## Preliminary pages

- [ ] Cover page — title, name, matric number, department, university, session, supervisor, date
- [ ] Certification / Declaration if required
- [ ] Acknowledgement
- [ ] Table of contents
- [ ] List of figures
- [ ] List of tables if applicable

## Abstract

- [ ] 250 words or fewer
- [ ] Motivation, problem, aim, method, findings, recommendations
- [ ] Describe Home / Stocks / Crypto / NGX — not `/analytics` or `/defi`
- [ ] Do not overclaim population impact

## Introduction

- [ ] Background, problem, aim, objectives, scope
- [ ] Link to Nigerian investors and NGX-oriented beginners

## Literature review

- [ ] Visualization, literacy, decision support, user-centered finance UIs
- [ ] Anomaly detection / Isolation Forest
- [ ] Nigerian market access where you have sources
- [ ] Each major claim has a citation

## Methodology

- [ ] Design-science / software engineering + case-based artifact evaluation
- [ ] Tools: React, Vite, Express, Recharts, Yahoo Finance, CoinGecko, NGX Pulse, FX
- [ ] Isolation Forest vs 3-sigma on the same series (`backend/src/utils/anomaly.js`)
- [ ] Unit tests for indicators
- [ ] Justify: you built and examined an artifact; you did not survey a population

## Findings / Results

- [ ] Case-based: home, stocks (including compare), NGX, unusual-day marks
- [ ] Screenshots from the live routes
- [ ] Safe wording: `the prototype indicates`, `the detector flags`, `potential benefit`

## Discussion

- [ ] Interpret against objectives
- [ ] Limitations: no user study, free-API gaps, detector parameters, not advice
- [ ] Effect on Nigerians is inferred from design, not measured

## Conclusion

- [ ] What was achieved, what remains, future work
- [ ] Stay inside the evidence you have

## References

- [ ] APA 7, alphabetical, hanging indent in Word
- [ ] Include Liu, Ting, and Zhou (2008) if you discuss Isolation Forest
- [ ] Every in-text citation appears in the list

## Evidence checklist

- [ ] Title matches supervisor approval
- [ ] Body matches the **current** app
- [ ] No leftover claims about AI explainer, DeFi scanner, or Monte Carlo wealth paths
- [ ] Findings use real screenshots
- [ ] Limitations are explicit

## Alignment with project artifacts

| Report need | Evidence in repo |
|-------------|------------------|
| Viva answers | [`VIVA_SCRIPT.md`](VIVA_SCRIPT.md) |
| Screenshots | [`REPORT_MANUSCRIPT_PLAN.md`](REPORT_MANUSCRIPT_PLAN.md) |
| Slides | [`SEMINAR_POWERPOINT_DECK.md`](SEMINAR_POWERPOINT_DECK.md) |
| Architecture | [`PROJECT_FRAMEWORK.md`](PROJECT_FRAMEWORK.md) |
| Detector | `backend/src/utils/anomaly.js` |
| Indicators | `backend/src/utils/normalize.js`, `backend/src/__tests__/indicators.test.js` |
| App shell | `frontend/src/App.jsx`, `StockPage.jsx`, `CryptoPage.jsx`, `NgxPage.jsx` |

## Final writing reminder

This is a **Computer Science** seminar with Nigerian relevance, not an investment pitch. Keep NGX and honest data as the local anchor. Keep impact claims tied to **design intent** and **artifact evidence**.
