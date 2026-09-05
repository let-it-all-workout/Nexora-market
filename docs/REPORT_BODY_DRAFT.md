> **Stale draft.** This file still describes simulation, an AI explainer, and extra market pages that **are not in the submitted app**. Use [`REPORT_MANUSCRIPT_PLAN.md`](REPORT_MANUSCRIPT_PLAN.md), [`VIVA_SCRIPT.md`](VIVA_SCRIPT.md), and the live Home / Stocks / Crypto / NGX screens for the bound report. Keep the cover title if your supervisor already approved it; rewrite the methodology and findings around Isolation Forest vs 3-sigma and honest charts.

[YOUR UNIVERSITY]  
[YOUR CAMPUS LOCATION]  
FACULTY OF [YOUR FACULTY]  
DEPARTMENT OF COMPUTER SCIENCE

A SEMINAR REPORT ON

**THE EFFECT OF A MARKET VISUALIZER ON NIGERIAN INVESTORS: DESIGN, IMPLEMENTATION, AND SIMULATION-BASED EVALUATION**

COURSE CODE: [YOUR COURSE CODE]

PRESENTED BY

[YOUR FULL NAME]  
[YOUR MATRIC NUMBER]

IN PARTIAL FULFILMENT OF THE REQUIREMENTS FOR THE AWARD OF A DEGREE IN COMPUTER SCIENCE

SUPERVISOR: [YOUR SUPERVISOR'S NAME]

APRIL, 2026

---

## CERTIFICATION

This is to certify that this seminar report titled **The Effect of a Market Visualizer on Nigerian Investors: Design, Implementation, and Simulation-Based Evaluation** was carried out by **[YOUR FULL NAME]** with matriculation number **[YOUR MATRIC NUMBER]** in the Department of Computer Science, [YOUR UNIVERSITY], under my supervision.

……………………………..                            …………………….  
[YOUR SUPERVISOR'S NAME]                      Date  
(Seminar Supervisor)

……………………………..                            …………………….  
[YOUR HOD'S NAME]                             Date  
(Head of Department)

---

## DEDICATION

This seminar report is dedicated to God Almighty for His grace and guidance, and to my family and mentors whose encouragement and support made this work possible.

---

## ACKNOWLEDGEMENT

I give thanks to God for the strength, wisdom, and grace to complete this seminar report successfully. I sincerely appreciate my supervisor, **[YOUR SUPERVISOR'S NAME]**, for the guidance, corrections, and academic encouragement provided throughout the course of this study.

I also acknowledge the lecturers in the Department of Computer Science, [YOUR UNIVERSITY], whose teaching and mentorship contributed to my academic development. My gratitude further extends to my family, friends, and well-wishers for their patience, encouragement, and support during the execution of this work.

Finally, I recognize the developers, institutions, and public data providers whose tools and platforms supported the design, implementation, and evaluation of this project.

---

## TABLE OF CONTENTS

Preliminary Pages	Page
Cover Page	i
Certification	ii
Dedication	iii
Acknowledgement	iv
Table of Contents	v
List of Figures	vi
Abstract	vii

Chapters	Page
Chapter One: Introduction
1.1 Background of the Study	1
1.2 Statement of the Problem	2
1.3 Aim of the Study	2
1.4 Objectives of the Study	2
1.5 Scope of the Study	3
1.6 Significance of the Study	3
1.7 Operational Definition of Key Terms	4

Chapter Two: Literature Review
2.1 Conceptual Framework	5
2.2 Theoretical Framework	6
2.3 Empirical Review	7
2.4 Nigerian Market Context	8
2.5 Related Systems and Design Implications	9
2.6 Literature Gap	10

Chapter Three: Methodology
3.1 Research Design	11
3.2 Data Collection Methods	12
3.3 Period of the Research	12
3.4 Tools and Techniques Used	13
3.5 System Architecture	14
3.6 Evaluation Procedure	14
3.7 Simulation Technique	15
3.8 Justification of the Method	15
3.9 Limitations of the Method	16

Chapter Four: Findings and Discussion
4.1 Case A: Home Page Orientation	17
4.2 Case B: NGX Analysis Workflow	18
4.3 Case C: AI-Supported Research Workflow	18
4.4 Case D: Simulation Workflow	19
4.5 Comparative Interpretation of the Cases	20
4.6 Summary of Findings	21
4.7 Discussion of Findings	21

Chapter Five: Summary, Conclusion and Recommendations
5.1 Summary of Findings	23
5.2 Conclusion	24
5.3 Recommendations	24

References	25

---

## ABSTRACT

This seminar report investigates the likely effect of a market visualizer on Nigerian-oriented investors through system design, implementation, and simulation-based evaluation. The study addresses a practical problem: many beginner investors can access market data but struggle to interpret charts, indicators, and news in a coherent way, especially within the Nigerian Exchange context. To address this gap, a full-stack web platform was developed using React, Vite, Express, and Recharts, with market data from Yahoo Finance, CoinGecko, NGX Pulse, and Open Exchange Rates.

The study adopted a design-science methodology supported by case-based system observation and reproducible simulation. Evaluation focused on four core workflows: platform orientation, NGX analysis, AI-assisted explanation, and simulation-based comparison between baseline and assisted decision conditions. Findings show that the prototype improves workflow clarity, strengthens local-market relevance, and provides useful interpretive support for beginner users. Reproducible simulation outputs indicate higher modeled decision accuracy and lower modeled latency under assisted conditions. The report recommends future controlled user studies, stronger onboarding support, and continued simulation validation.

The study does not claim direct behavioral measurement of Nigerian investors because no survey, interview, or controlled user experiment was conducted. Its contribution is therefore technical and methodological: it demonstrates how a Nigerian-focused market visualization system can be built and evaluated in an academically responsible manner.

Keywords: market visualizer, Nigerian Exchange, investor education, decision support, simulation

---

# CHAPTER ONE
## INTRODUCTION

Digital platforms have made financial market data widely available to students and retail investors. However, access to data does not automatically produce understanding. Many beginner investors can see price movements but cannot confidently interpret trends, indicators, or market context.

This challenge is more visible in Nigeria, where many popular platforms prioritize foreign markets over local requirements. As a result, Nigerian-oriented users often face fragmented information, weak interpretive support, and low confidence in decision-making. The practical need is not only for more data, but for clearer and more contextual presentation of data.

This report addresses that need through the design and evaluation of a market visualizer that combines NGX-focused analysis, multi-asset comparison, AI-assisted explanation, and simulation-based decision support within one workflow. The study evaluates likely user benefit through technical evidence and modeled comparison, without overstating direct behavioral impact.

The topic is important because financial participation increasingly begins on digital interfaces rather than in formal brokerage offices or physical trading floors. When interface quality is poor, beginners may misread volatility, overreact to headlines, or abandon analysis entirely. When interface quality is stronger, the same user may gain better orientation, ask better questions, and make more cautious decisions. In that sense, interface design becomes a meaningful part of investor education.

### 1.1 Background of the Study

The Nigerian capital market supports capital formation, business growth, and wealth creation. Through the Nigerian Exchange (NGX), firms raise capital while investors access equity participation and long-term portfolio opportunities. Despite this role, retail participation remains constrained by low financial literacy and weak confidence in market interpretation.

For beginner investors, meaningful interpretation requires more than raw prices. It depends on clear presentation of trend behavior, volatility, momentum, and related news. Where these inputs are scattered or overly technical, decision quality drops and market participation may decline.

Advances in modern web frameworks and open financial APIs now make it feasible to build integrated, education-oriented market tools. From a computer-science perspective, this creates a strong opportunity to design systems that improve interpretation quality through structured visualization and guided interaction.

This opportunity is especially relevant in a context where many new participants encounter finance first through phones, social platforms, blog posts, and short-form commentary rather than through formal investment training. In such settings, speed of access may improve while depth of understanding remains weak. A well-designed visualizer can act as an intermediate layer between raw market data and beginner interpretation by slowing down impulsive reading and making important signals easier to inspect.

### 1.2 Statement of the Problem

The core problem is the absence of a beginner-friendly, NGX-aware analysis platform that integrates local relevance, visual clarity, explanatory support, and simulation-based evaluation in a single environment. Existing tools often provide raw data but insufficient interpretive guidance for novice Nigerian-oriented users.

More specifically, the problem appears in at least four ways. Market information is often fragmented across multiple pages and providers. Local-market orientation is weak when Nigerian users must depend on foreign-first tools. Interpretive features such as moving averages, volatility, and headline context are not always explained in plain language. Finally, many tools show price information without offering a safe educational space for comparing what a baseline decision path might look like against an assisted one.

### 1.3 Aim of the Study

The aim of this study is to design and evaluate a market visualizer that improves accessibility, understanding, and modeled decision support for Nigerian-oriented users.

### 1.4 Objectives of the Study

The objectives of the study are to:

1. design and implement a full-stack market visualizer supporting NGX assets, global equities, crypto-assets, commodities, and simulation
2. provide a beginner-friendly interface for interpreting charts, metrics, and market news
3. improve local relevance through NGX-focused workflows and naira-native presentation
4. integrate AI-assisted explanation to support user understanding during analysis
5. evaluate likely user benefit through simulation-based comparison of baseline and assisted outcomes
6. expose source provenance, confidence cues, and fallback behavior so that users can judge data quality more responsibly
7. document system limitations and report findings with academic caution
8. provide a technical foundation that future studies can extend with real-user testing and broader validation

### 1.5 Scope of the Study

This study covers the design, implementation, and technical evaluation of a market visualizer with NGX analysis, global market comparison, AI-assisted explanation, and simulation-based assessment.

The study does not include brokerage execution, personalized investment advice, or direct empirical measurement through surveys, interviews, or controlled user experiments. Therefore, all effect claims are interpreted as likely or modeled effects, not direct behavioral proof.

The scope also excludes full production deployment concerns such as brokerage compliance integration, custodial account management, payment processing, and enterprise-scale infrastructure. The implemented artifact is a seminar-grade prototype intended for demonstration, analysis, and methodological discussion. It is sufficiently complete for academic evaluation, but it is not presented as a market-ready commercial platform.

### 1.6 Significance of the Study

The significance of this study is threefold:

1. academic significance: it demonstrates how software engineering, visualization, AI support, and simulation can be integrated in a single educational financial system
2. practical significance: it prioritizes Nigerian market context, especially NGX usability for beginner users
3. research significance: it provides a technical baseline for future empirical studies on real user behavior and learning outcomes

The study is also significant in instructional terms. It offers a concrete example of how students of computer science can apply frontend engineering, backend services, data integration, and human-centered design to a locally meaningful problem. In that sense, it contributes to project-based learning as well as to market-tool design.

### 1.7 Operational Definition of Key Terms

For clarity, the following terms are used in this report with specific meanings:

1. market visualizer: a software platform that presents market data through charts, metrics, filters, and contextual explanation
2. Nigerian-oriented users: users whose learning or investment interests are tied to the Nigerian capital market, especially NGX
3. modeled decision support: guidance assessed through simulation and comparative modeling rather than live trading outcomes
4. beginner investors: users with limited experience interpreting market charts, indicators, and news
5. AI-assisted explanation: plain-language interpretive support generated inside the platform to clarify concepts, risks, and market context
6. confidence cues: interface indicators that summarize source quality, freshness, completeness, or fallback state for the displayed data
7. simulation lab: the analytical workspace in which seeded baseline and assisted scenarios are compared under configurable assumptions

These definitions restrict the scope of the claims. The project does not predict guaranteed returns or replace professional financial advice.

---

# CHAPTER TWO
## LITERATURE REVIEW

The literature for this study is organized into four areas: market visualization, investor learning, decision-support systems, and behavior under uncertainty. Together, these areas establish the conceptual and empirical basis for the project.

### 2.1 Conceptual Framework

Three concepts anchor this study:

1. market visualization: presentation of financial data through clear charts, indicators, and structure that support pattern recognition
2. investor learning support: design elements that convert raw data exposure into practical understanding for beginner users
3. decision-support integration: coordinated tools that reduce interpretive burden by combining data, context, and explanation in one workflow
4. data-trust signaling: interface elements that communicate source provenance, confidence, freshness, and fallback status so users can interpret market data more carefully

These concepts are connected rather than isolated. Visualization makes patterns visible, learning support makes those patterns understandable, decision-support integration reduces workflow fragmentation, and trust signaling helps the user judge whether displayed data should be treated confidently or cautiously. The present study adopts all four because a beginner-friendly market system must support not only seeing information but also interpreting and trusting it appropriately.

### 2.2 Theoretical Framework

The study draws on three related perspectives:

1. information-processing theory: users interpret better when information is structured, simplified, and contextually grouped
2. technology acceptance model (Davis, 1989): adoption improves when systems are perceived as useful and easy to use
3. behavioral decision theory: investor choices are influenced by uncertainty, bias, and cognitive limits, so interface design can affect interpretation quality
4. user-centered design (Norman, 2013): systems are more usable and trustworthy when design is shaped around real user goals, limits, and feedback needs

Information-processing theory helps explain why a visualizer should group charts, signals, and news in a coherent layout instead of forcing users to mentally combine scattered sources. The technology acceptance model explains why even technically capable tools may fail if they appear difficult or irrelevant to the intended audience. Behavioral decision theory explains why investors under uncertainty may overreact, anchor on recent movement, or misread noisy trends. User-centered design complements these perspectives by emphasizing clarity, feedback, and reduction of avoidable friction.

### 2.3 Empirical Review

Prior studies show that design quality influences decision quality. Barber and Odean (2000) reported that many individual investors make decisions that reduce long-term performance, reinforcing the need for stronger interpretive support. Few (2012) and Munzner (2014) demonstrated that clear visual structure improves comprehension and reduces cognitive overload.

Davis (1989) established that perceived usefulness and ease of use strongly shape system adoption. Norman (2013) further emphasized user-centered design as a condition for usability and trust. Kahneman (2011) explained how uncertainty and cognitive bias affect decisions, supporting the role of structured assistance and simulation in financial interfaces.

Macro-level evidence from Demirguc-Kunt et al. (2022) and institutional sources (CBN, SEC Nigeria, NGX Group) supports the broader argument that digital tools can improve market participation when they improve accessibility and understanding.

The empirical literature also supports the idea that presentation format matters, not merely information quantity. Few (2012) argued that good visual design helps users compare values, identify trends, and notice anomalies with less effort. Munzner (2014) similarly showed that visualization is most effective when it is aligned with the user task and cognitive demands. For beginner investors, this implies that a chart alone is insufficient if it is not paired with labeling, context, and workflow guidance.

Behavioral literature further strengthens this argument. Kahneman (2011) showed that people often rely on heuristics under pressure, especially when information is complex or uncertain. In financial settings, this can translate into overconfidence, noise-driven reactions, and shallow pattern interpretation. A guided market interface may not remove such tendencies, but it can create a more deliberate environment by slowing interaction, organizing context, and making relevant indicators more visible.

### 2.4 Nigerian Market Context

The Nigerian context introduces specific design requirements: naira-native display, NGX-focused asset access, and explanation of local market signals in plain language. Platforms designed mainly for foreign markets may provide broad coverage but weak local usability.

Many beginners also rely on fragmented channels such as social media and informal commentary. This creates high exposure to noise and low exposure to structured interpretation. A unified visualization workflow is therefore especially relevant in the Nigerian environment.

The context also increases the importance of trust and transparency. When users are already navigating mixed-quality online information, a local-market tool must do more than show prices. It should help users understand where data came from, whether a fallback source was used, and how confidently the displayed result should be interpreted. This is particularly relevant in environments where rate limits, API availability, and data delays can affect user experience.

### 2.5 Related Systems and Design Implications

Existing systems often optimize either for analytical depth or for simplicity, but rarely for both beginner usability and local context. Advanced platforms are data-rich but cognitively demanding, while simplified tools may lack contextual depth and explanatory support.

The design implication is clear: effective educational market tools should preserve analytical value while reducing interpretation burden through better structure, context, and guidance. This principle guided the architecture of the present platform.

Another design implication concerns system honesty. A responsible educational platform should disclose source provenance, indicate when fallback data is being used, and frame automated explanation as assistance rather than authority. This matters because beginners are often more vulnerable to interface overtrust. The present study therefore treats transparency features as part of usability, not as optional extras.

### 2.6 Literature Gap

A clear gap remains in tools that combine NGX relevance, beginner usability, integrated explanation, and simulation-based evaluation in one environment. This study addresses that gap by placing Nigerian market interpretation at the center of the design while retaining multi-asset comparison.

The gap can be stated more precisely in four dimensions. First, there is a local-context gap because many available tools do not foreground NGX analysis. Second, there is an interpretation gap because data presentation often assumes prior experience. Third, there is a workflow gap because research, chart reading, and scenario comparison are usually separated across different tools. Fourth, there is an evaluation gap because many educational interfaces are discussed conceptually without a reproducible method for comparing baseline and assisted conditions.

---

# CHAPTER THREE
## METHODOLOGY

This study used a design-science, software-engineering methodology. The focus was to build and evaluate a technical artifact, not to run a large-scale social survey.

### 3.1 Research Design

The project followed an iterative design-build-evaluate cycle:

1. problem definition and requirements
2. architecture and module planning
3. frontend and backend implementation
4. workflow evaluation through case observation and simulation

This design is appropriate because the study evaluates system usefulness through technical evidence and modeled comparison.

In practical terms, the design-science approach allowed the study to move from a clearly stated problem to an implemented artifact and then to an evaluation of whether the artifact addressed the problem. Requirements were derived from literature, local-market relevance, and beginner-interpretation needs. The system was then organized into modules so that each design requirement, such as chart clarity, NGX access, AI explanation, and simulation, could be traced to an implemented feature.

### 3.2 Data Collection Methods

The study relied on four main sources of evidence:

1. relevant literature from books, journal articles, and institutional publications
2. direct observation of the completed platform and its workflows
3. simulation outputs generated by the application
4. technical implementation evidence derived from architecture, features, and testing

These sources were selected because the project is technical rather than survey-based. Literature provided theory, observation provided workflow evidence, simulation provided comparative outputs, and implementation artifacts demonstrated technical validity.

Technical evidence included the defined route structure of the backend, the modular page structure of the frontend, the seeded simulation engine, provider fallback logic, and automated tests covering API and simulation behavior. These artifacts were treated as valid sources because they show how the system actually behaves rather than how it was only intended to behave.

### 3.3 Period of the Research

Research and implementation were conducted during the 2024/2025 academic session and finalized for seminar presentation in 2026.

The work progressed through identifiable phases. Early work focused on topic framing, literature review, and architectural planning. The middle phase focused on implementing the frontend pages, backend routes, and data-integration services. The final phase focused on simulation refinement, documentation, testing, and report preparation. This phased structure helped maintain consistency between the artifact, the report, and the seminar presentation materials.

### 3.4 Tools and Techniques Used

The system used:

1. frontend: React 19, React Router, and Vite
2. backend: Node.js with Express 5 and ES module structure
3. visualization: Recharts
4. market-data utilities: axios, yahoo-finance2, and custom normalization helpers
5. data sources: Yahoo Finance, CoinGecko, NGX Pulse, and Open Exchange Rates
6. support modules: AI explanation layer, portfolio analytics, and a seeded simulation engine
7. verification tools: Vitest and Supertest
8. development orchestration: concurrently at the repository root for combined frontend and backend startup

A modular architecture separated routing, data services, simulation logic, and interface rendering. This improved maintainability, reduced coupling, and supported multi-asset extensibility.

Additional implementation tools strengthened reliability and development workflow. React Router supported separation of market workspaces into dedicated pages. Axios and custom market-data helpers supported controlled provider requests and normalization. Vitest and Supertest supported automated verification of simulation behavior and API responses. Simple caching, retry handling, and fallback logic were used to reduce disruption when upstream providers were slow or rate-limited.

### 3.5 System Architecture

The architecture follows a client-server model. The frontend handles interaction and visualization; the backend handles data retrieval, normalization, and simulation processing. Functionally, the system is organized into NGX, stocks, crypto, commodities, and simulation modules, with AI explanation available across analysis workflows.

At the backend layer, Express route modules expose APIs for stocks, crypto, foreign exchange, NGX data, simulation, portfolio analysis, and the embedded assistant. Service modules manage communication with external data providers, while utility modules normalize the returned data into a chart-friendly structure. Requests are routed through a shared /api base path, allowing the frontend to communicate consistently with market-data, simulation, and analytics services.

The architecture also includes reliability-oriented behavior. Cached responses reduce repeated calls, retry logic helps the NGX route tolerate provider limits, fallback sources are used for some asset categories, and quality metadata is attached to results so the interface can show source confidence and fallback state. These details matter because a beginner-oriented financial system should communicate uncertainty rather than hide it.

### 3.6 Evaluation Procedure

Evaluation followed four steps:

1. observe core workflows: home orientation, NGX analysis, AI explanation, and simulation
2. assess feature behavior against stated objectives and against the literature-derived design requirements
3. verify implementation stability through automated backend tests and a successful frontend production build
4. compare baseline and assisted outputs under repeatable simulation conditions using fixed-seed runs

This procedure is not a controlled experiment, but it provides a valid seminar-level basis for judging whether the artifact meets its design goals.

The evaluation also used a set of practical criteria derived from the objectives of the study. These included clarity of navigation, relevance to Nigerian users, continuity between chart reading and explanation, transparency of data sourcing, and reproducibility of the simulation output. A workflow was judged stronger when it reduced unnecessary context-switching and made interpretation easier without presenting itself as authoritative financial advice.

### 3.7 Simulation Technique

The simulation uses seeded stochastic logic to ensure reproducibility. It compares baseline and assisted conditions across decision accuracy, decision latency, risk level, and simulated return. The simulator is comparative and educational; it is not a price-forecasting engine.

The engine supports multiple methods, including Monte Carlo, scenario matrix, sensitivity sweep, agent-based, and system-dynamics modes. Across these methods, the same broad logic is preserved: synthetic paths are generated under configurable conditions, a user profile is evaluated across those paths, and baseline and visualizer-assisted states are compared. This allows the study to discuss not only one-off results but also patterned differences under varying assumptions.

In each trial, the baseline and assisted conditions are evaluated on the same generated path so that comparison remains fair. Outputs include decision accuracy, decision latency, risk score, and simulated return from a normalized initial capital of 1,000 units. These metrics are interpreted as modeled indicators of support quality rather than as direct measures of real investor performance.

Reproducibility is strengthened through the use of fixed seeds. When the same seed and parameters are used, the same random sequence is produced, allowing fair A/B comparison and repeatable seminar demonstrations. This is especially important because the study relies on modeled evidence rather than live experimental subjects.

### 3.8 Justification of the Method

The method is suitable because the study evaluates a software artifact. Given the absence of field experiments, case-based evaluation plus simulation is an academically defensible approach for discussing likely impact without overstating real-world proof.

The method is further justified by the nature of the research question. The report is asking whether a locally oriented market visualizer can be designed and whether its features plausibly improve interpretation and modeled decision support. Those are questions about artifact construction, workflow quality, and comparative behavior under defined assumptions. Design-science and reproducible simulation are therefore well matched to the problem.

### 3.9 Limitations of the Method

Key limitations include:

1. no direct user-study evidence (interviews, surveys, controlled experiments)
2. simulation outputs depend on model assumptions
3. external API quality, rate limits, and availability can affect data reliability
4. AI explanations are assistive and may simplify or omit nuance
5. evaluation was performed on a working prototype, not a full production deployment

These limitations are acknowledged to preserve methodological transparency.

Additional limitations should also be noted. AI-generated explanations can be useful but are not guaranteed to be complete or correct in every case. Synthetic simulation paths simplify real market behavior and do not model all institutional, regulatory, or liquidity conditions. Provider rate limits may occasionally affect freshness of returned data, especially for external services. Finally, the report focuses mainly on interpretive and educational value rather than on long-run investment performance in real accounts.

---

# CHAPTER FOUR
## FINDINGS AND DISCUSSION

The implemented system provides an integrated workflow for analysis, explanation, and simulation. Findings are presented through four case-based observations.

### 4.1 Case A: Home Page Orientation

The home page functions as a workflow map. It presents clear entry points to NGX, stocks, crypto, commodities, and simulation. This structure reduces first-use friction and improves approachability for beginner users.

The orientation value of the home page comes from how it stages the user journey. The page introduces the product as an educational market workspace, presents clear calls to action, highlights coverage areas, and explains a simple sequence of use: select an asset, read context, ask for explanation, and simulate a decision path. This matters because beginners often need guidance about what to do first, not just access to a large set of options.

### 4.2 Case B: NGX Analysis Workflow

The NGX module is the strongest local-context feature. It combines search, charting, and naira-native interpretation to reduce dependence on foreign-first tools. This directly addresses the local relevance gap identified in Chapter Two.

The NGX workflow provides more than a static local ticker view. It includes search support, market-overview context, charting of selected equities, expanded headline coverage, and a direct handoff into the simulator. By allowing the user to remain inside one coherent flow, it reduces the need to jump between general market sites, isolated charts, and unrelated commentary channels.

### 4.3 Case C: AI-Supported Research Workflow

The AI feature is a **workspace explainer**: it answers from a live multi-source snapshot (NGX Pulse, Yahoo, CoinGecko, Stooq, Google News RSS), not from general web chat. Forecasts and off-screen trivia are refused. This is educational support, not advice.

This workflow is significant because it reduces the break in attention that usually occurs when a user leaves a charting page to search externally for definitions or explanations. The embedded assistant receives page context and can explain asset characteristics, compare the visible numbers, identify possible risks, and answer follow-up questions in plainer language. That continuity supports the educational goal of the system.

### 4.4 Case D: Simulation Workflow

The simulation module links interpretation to comparative decision modeling. Users can run baseline versus assisted scenarios under reproducible settings. This provides evaluative depth beyond chart display while avoiding unsupported claims about real trading outcomes.

The simulation page extends the project from descriptive visualization into comparative reasoning. It allows configuration of method, scenario, time horizon, and user-profile variables such as literacy, risk tolerance, reaction speed, usability score, and volatility stress. It also supports outputs that are easier to discuss in a seminar setting, including metric summaries, sample distributions, and CSV export.

Each run now records the selected asset, historical observation window, data source, estimated daily drift, and estimated daily volatility. Baseline and assisted conditions use the same generated market path and paired random decision sequence so that the comparison is not distorted by unrelated random draws. Numerical examples should therefore be exported from a named, calibrated run rather than quoted as universal fixed results. These values remain modeled comparative outputs, not measured investor outcomes or investment forecasts.

### 4.5 Comparative Interpretation of the Cases

Together, the four cases confirm that the platform functions as one coherent system rather than isolated pages:

1. orientation: home page clarifies the workflow
2. local relevance: NGX module anchors Nigerian context
3. interpretation: AI support explains unfamiliar concepts in-place
4. evaluation: simulation compares baseline and assisted decisions

This integration is central to the platform's value proposition.

The cases also reveal a deeper pattern: each module reduces a different kind of beginner burden. The home page reduces entry burden, the NGX page reduces local-context burden, the AI assistant reduces concept burden, and the simulation page reduces evaluation burden by making comparison explicit. This layered reduction of burden is one of the strongest findings of the study.

The broader scenario-matrix output supports the same interpretation. Across bull, bear, sideways, and shock regimes, the assisted condition maintained positive accuracy and return deltas while also reducing the modeled latency score. This suggests that the direction of modeled benefit is not tied only to one favorable scenario, even though the exact magnitude varies by regime and profile settings.

### 4.6 Summary of Findings

The key findings are:

1. the system was implemented successfully as a multi-module full-stack platform
2. NGX-first design improved local contextual relevance
3. AI explanation improved interpretive continuity for beginner users
4. simulation outputs indicated improved modeled accuracy, lower modeled latency, lower modeled risk score, and higher modeled return in assisted conditions
5. source provenance, confidence signaling, and fallback messaging improved transparency of data use
6. automated tests and a successful production build strengthened technical credibility of the artifact
7. the integrated workflow aligned with the objectives defined in Chapter One

### 4.7 Discussion of Findings

The findings indicate that the project met its technical and educational objectives. Platform value was strongest where local relevance and interpretive support were combined. The NGX-first workflow improved contextual fit for Nigerian users, while AI assistance reduced interpretation barriers for beginners.

The findings are also consistent with the literature reviewed earlier. The emphasis on visual clarity and structured presentation aligns with the arguments of Few and Munzner that better information design reduces cognitive burden. The focus on ease of use, guidance, and user confidence also aligns with Davis and Norman, whose work suggests that usefulness, usability, and user-centered design influence trust and adoption.

Simulation added methodological strength by providing a structured basis for comparing decision conditions. Although not a forecasting engine, it helped evaluate the plausible influence of interface support on modeled decision quality. In that sense, the simulation findings align more with behavioral decision theory than with prediction science: they show how clearer tools may improve modeled judgment under uncertainty, not how real prices will behave in the market.

Overall, the discussion supports the core seminar claim: clearer, contextual, and guided visualization can improve the interpretability of financial information. However, claims remain bounded by methodological limits, including absence of direct user experiments and dependence on simulation assumptions.

The findings also suggest that local relevance is not a minor design preference. In this study, NGX support was not simply another market tab. It functioned as the main proof that a Nigerian-oriented workflow can be centered in the product architecture rather than treated as an afterthought. This is important for the seminar argument because the project claims local-market orientation as one of its distinct contributions.

---

# CHAPTER FIVE
## SUMMARY, CONCLUSION AND RECOMMENDATIONS

### 5.1 Summary of Findings

This study designed, implemented, and evaluated a market visualizer for Nigerian-oriented users. Findings show that the platform delivers a coherent workflow combining orientation, NGX analysis, AI explanation, and simulation-based comparison. The system addressed the identified local relevance gap and demonstrated measurable gains in modeled decision conditions under assisted scenarios.

The study also showed that the value of the platform lies in its integration of several forms of support rather than in any single feature taken alone. The home page improved orientation, the NGX workspace improved local relevance, the AI assistant improved interpretive continuity, and the simulation lab improved comparative reasoning. Together, these modules created a stronger educational workflow than a standalone chart page or a disconnected research tool would provide.

Another important finding is that technical credibility supported the academic credibility of the project. The use of a modular frontend and backend structure, source-specific routes, provider fallback logic, confidence indicators, and automated tests made the artifact easier to justify as a serious seminar system rather than as a purely visual mock-up. This means the report contributes not only an argument about investor support, but also a concrete example of how engineering choices can strengthen the quality of academic software projects.

### 5.2 Conclusion

The study concludes that a well-structured, NGX-aware visual platform can improve the clarity and interpretability of market information for beginner users. The strongest contribution of this work is technical and methodological: it demonstrates how a local-market decision-support artifact can be built and evaluated with academic rigor without overstating behavioral proof.

The conclusion of the study is not that technology can eliminate investment risk or replace financial judgment. Rather, it is that careful interface design can improve how uncertainty is presented, interpreted, and compared. In the Nigerian context, that contribution is meaningful because local users often need both stronger market orientation and clearer educational support. The project therefore stands as a credible seminar demonstration of how visualization, explanation, and simulation can be combined in one local-market artifact.

The conclusion also has a wider implication for computer-science education. It shows that locally relevant software problems can be approached through disciplined system design, not only through abstract theory. By combining human-centered interface choices with backend data services and reproducible modeling, the project demonstrates how computing can be applied to a practical Nigerian problem in a way that is technically grounded and academically defensible.

In summary, the report supports a balanced final position. The market visualizer should not be interpreted as a finished investment product or as proof of universal investor behavior. However, it does provide strong evidence that a beginner-focused, NGX-centered, and transparently designed platform can create better conditions for learning and modeled decision support than fragmented or foreign-first workflows alone. That is a meaningful contribution for a seminar report in computer science.

### 5.3 Recommendations

The following recommendations are proposed:

1. conduct controlled user studies with Nigerian students and beginner investors to measure confidence, interpretation quality, and decision behavior
2. improve onboarding, glossary support, and indicator explanations so that first-time users can learn more quickly
3. optimize the interface further for mobile screens and low-bandwidth environments common in student and retail settings
4. extend NGX-related contextual features, including broader market summaries and richer local-news interpretation
5. refine the simulation engine with more scenario realism and additional validation against historical market behavior
6. strengthen data-quality communication by expanding provenance notes, freshness indicators, and fallback warnings
7. maintain clear ethical safeguards so that AI explanations remain assistive, educational, and not misleadingly advisory
8. explore broader empirical research that compares learning outcomes before and after exposure to the platform

These recommendations can be grouped into three broad future directions. The first is empirical validation, which includes user studies and learning-outcome measurement. The second is product refinement, which includes onboarding, mobile optimization, richer NGX context, and clearer data-quality feedback. The third is methodological strengthening, which includes more realistic simulation assumptions, broader validation against market history, and continued ethical control of AI-generated explanations.

If these next steps are pursued, the project could move from a seminar-grade prototype toward a more mature educational market platform. Even if future work reveals limitations or mixed outcomes, that would still be valuable because it would convert the present modeled claims into stronger evidence grounded in real user interaction. For that reason, the most important recommendation is not simply to add more features, but to continue improving the quality of evidence used to evaluate the system.

---

# REFERENCES

Barber, B. M., & Odean, T. (2000). Trading is hazardous to your wealth: The common stock investment performance of individual investors. *The Journal of Finance, 55*(2), 773-806. https://doi.org/10.1111/0022-1082.00226

Central Bank of Nigeria. (n.d.). *Central Bank of Nigeria*. Retrieved April 8, 2026, from https://www.cbn.gov.ng/

CoinGecko. (n.d.). *Cryptocurrency prices, market cap, and API*. Retrieved April 8, 2026, from https://www.coingecko.com/

Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. *MIS Quarterly, 13*(3), 319-340. https://doi.org/10.2307/249008

Demirguc-Kunt, A., Klapper, L., Singer, D., Ansar, S., & Hess, J. (2022). *The Global Findex Database 2021: Financial inclusion, digital payments, and resilience in the age of COVID-19*. World Bank. https://doi.org/10.1596/978-1-4648-1897-4

Few, S. (2012). *Show me the numbers: Designing tables and graphs to enlighten* (2nd ed.). Analytics Press.

Hull, J. C. (2022). *Options, futures, and other derivatives* (11th ed.). Pearson.

Kahneman, D. (2011). *Thinking, fast and slow*. Farrar, Straus and Giroux.

Munzner, T. (2014). *Visualization analysis and design*. CRC Press.

Nigerian Exchange Group. (n.d.). *Nigerian Exchange Group*. Retrieved April 8, 2026, from https://ngxgroup.com/

NGX Pulse. (n.d.). *NGX Pulse API*. Retrieved April 8, 2026, from https://www.ngxpulse.ng/api

Norman, D. A. (2013). *The design of everyday things* (Revised and expanded ed.). Basic Books.

Open Exchange Rates. (n.d.). *Open Exchange Rates API*. Retrieved April 8, 2026, from https://openexchangerates.org/

Securities and Exchange Commission Nigeria. (n.d.). *Securities and Exchange Commission Nigeria*. Retrieved April 8, 2026, from https://sec.gov.ng/

World Bank. (n.d.). *Global Findex Database*. Retrieved April 8, 2026, from https://www.worldbank.org/en/publication/globalfindex

Yahoo Finance. (n.d.). *Yahoo Finance*. Retrieved April 8, 2026, from https://finance.yahoo.com/
