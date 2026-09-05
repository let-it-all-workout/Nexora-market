# Simulation and modeling — out of scope

The Monte Carlo / multi-method **simulation engine**, **portfolio analyser**, and **Analytics** page were **removed** from the submitted software.

They are **not** part of the demo, API, or viva walkthrough.

## What replaced that story

Unusual-day **detection** on the loaded chart:

- **3-sigma** on return or volume (`anomalySigma`, gold ring)
- **Isolation Forest** on a 4-D feature vector (`anomalyMl`, wine fill)

Implementation: `backend/src/utils/anomaly.js`  
Chart marks: `frontend/src/components/MarketChart.jsx`

That comparison is **not** a price forecast and **not** a model of investor wealth.

## If an examiner asks about the old title

The approved seminar title may still mention “simulation-based evaluation.” Answer: an earlier prototype included a simulator; it was dropped so the project would only claim methods that still exist. Evaluation is now implementation evidence plus Isolation Forest versus 3-sigma.

Do not describe `POST /api/simulation/run` or `/analytics` as if they are live.
