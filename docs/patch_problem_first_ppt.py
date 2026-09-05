"""Stale patcher. Do not run. Rebuild from build_seminar_ppt.py instead."""

from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "Defence_Deck_Report_Format.pptx"
OUTPUT = ROOT / "Defence_Deck_Report_Format_PROBLEM_FIRST.pptx"

REPLACEMENTS = {
    "ppt/slides/slide1.xml": {
        "Why we built it": "Real Nigerian struggles",
        "What the system does": "How the tool tackles them",
        "How we evaluated it": "How it was built and evaluated",
    },
    "ppt/slides/slide2.xml": {
        "Why This Project Exists": "Tangible Struggles Nigerian Beginners Face",
        "Many beginner investors can see prices, but they still struggle to understand charts, trends, and risk.":
            "NGX information is often scattered across broker apps, exchange pages, news sites, WhatsApp groups, and social-media posts.",
        "Most tools are more foreign-market focused than NGX-focused, so local users often get less contextual support.":
            "Many beginners can see prices, but they cannot easily tell whether a move shows trend, volatility, or rising risk.",
        "This creates a gap between access to market data and actual understanding of market information.":
            "Foreign-first tools often give weak NGX context, so Nigerian users must combine several sources by themselves.",
        "Core Problem": "Without A Local Visualizer",
        "Nigerian beginners need a clearer, more local, more explainable way to analyze markets.":
            "Analysis becomes fragmented, slow, and easy to misunderstand.",
    },
    "ppt/slides/slide3.xml": {
        "Solution": "Reality",
        "Platform Overview": "What Happens Without The Tool",
        "Market Visualizer": "Scattered Information",
        "Charts, market context, related news, and clearer asset analysis across NGX, stocks, crypto, and commodities.":
            "A beginner may jump between exchange pages, headlines, broker screens, and social media before understanding one asset.",
        "AI Research Support": "Weak Local Context",
        "An embedded assistant that explains terms, market moves, and page context in simpler language.":
            "Many platforms are stronger for US markets than NGX, so Nigerian users get less local explanation and less naira-first interpretation.",
        "Simulation Lab": "Guesswork And Rumor",
        "A modeling layer that compares baseline decision behavior with visualizer-assisted behavior.":
            "When charts are not explained clearly, users may depend on hype, informal commentary, or incomplete understanding.",
    },
    "ppt/slides/slide4.xml": {
        "Product Visuals": "Response",
        "Live Product Views": "How The Tool Responds To Those Problems",
        "Home / product entry": "One place to start and navigate",
        "NGX analysis workflow": "NGX-focused local workflow",
        "AI-assisted analysis": "AI explains what the user is seeing",
        "View 1": "Response 1",
        "View 2": "Response 2",
        "View 3": "Response 3",
        "These are the strongest live product views for the presentation.":
            "The tool responds through centralization, local context, and in-flow explanation.",
    },
    "ppt/slides/slide5.xml": {
        "Visual Proof": "Product Depth",
        "More Product Views": "What Was Actually Built",
        "Stock visualization workflow": "Multi-asset analysis workspace",
        "Broader market/news context": "Broader market and news context",
        "Stock Visualizer": "Analysis Workspace",
        "Market Context": "Research Context",
        "These extra views prove the product has depth beyond a single screen.":
            "These additional screens show the product has depth beyond one page.",
    },
    "ppt/slides/slide6.xml": {
        "Why This Matters in Nigeria": "Why This Matters In Nigeria",
        "NGX-centered support is often weaker than support for foreign markets.":
            "Many beginners rely on scattered online commentary when formal market interpretation is weak.",
        "Many new users need help connecting local news, charts, and market meaning.":
            "Social-media and rumor-driven information can be fast, but it is often incomplete or noisy.",
        "A local-market-first design can improve confidence, orientation, and financial understanding.":
            "A clearer NGX-first platform may reduce confusion and support more careful learning.",
        "Seminar Claim": "Local Need",
        "The platform may improve accessibility, understanding, and modeled decision support for Nigerian-oriented users, especially beginners.":
            "The platform is designed to reduce confusion, restore local context, and make Nigerian market analysis easier to understand.",
    },
    "ppt/slides/slide7.xml": {
        "User Journey": "How A User Moves Through The Tool",
        "Send the asset into simulation": "Compare baseline vs assisted outcomes",
    },
    "ppt/slides/slide8.xml": {
        "System Architecture": "What We Built",
        "User Interface": "React Frontend",
        "Market Visualizer": "NGX & Market Views",
        "AI Research Layer": "AI Explanation",
        "Frontend, explanation, and modeling are connected inside one product workflow.":
            "Built as one connected system so analysis, explanation, and evaluation stay together.",
    },
    "ppt/slides/slide9.xml": {
        "Build and Evaluation Approach": "How It Was Built And Evaluated",
        "Recharts for visualization": "Recharts for chart visualization",
        "Yahoo Finance, CoinGecko, NGX Pulse": "Yahoo Finance, CoinGecko, NGX Pulse APIs",
        "Case-based observation": "Case-based observation of workflows",
        "Simulation-based comparison": "Simulation-based comparison of effect",
    },
    "ppt/slides/slide10.xml": {
        "Nigeria Lens": "Problem Mapping",
        "Why NGX Focus Matters": "How Our Tool Tackles Each Problem",
        "The local-market angle gives the project strong Nigerian relevance.":
            "Scattered information -> one workflow connects charts, context, news, and simulation.",
        "Naira-native analysis makes the interface feel more meaningful for local users.":
            "Weak NGX support -> the NGX workspace adds naira-native local analysis.",
        "NGX-first support helps reduce the gap between foreign-market tools and local-market understanding.":
            "Poor explanation -> AI support helps users understand terms, moves, and risk.",
        "Local Value": "Tool Response",
        "The project is not just a general market tool. It is designed to make Nigerian market analysis more understandable and more accessible.":
            "The tool is designed to turn confusion into clearer analysis, local meaning, and better modeled decision support.",
    },
    "ppt/slides/slide11.xml": {
        "Simulation": "Measured Effect",
        "Simulation Highlights": "Measured Example",
        "User-selected asset": "Bull scenario | 400 trials | seed 2026",
        "Configurable scenario and duration": "Accuracy: 56.1% -> 70.3%",
        "Baseline vs assisted comparison": "Latency: 7.70 -> 6.00",
        "Educational model, not a market forecast": "Risk: 0.540 -> 0.420 | Return: 0.065 -> 0.182",
    },
    "ppt/slides/slide12.xml": {
        "Key Outcomes": "Tangible Outcomes",
        "The platform successfully combines market analysis, explanation, and simulation in one workflow.":
            "The system successfully centralizes charts, context, explanation, and simulation in one workflow.",
        "The NGX workspace gives the project strong local relevance and a clearer Nigerian-market angle.":
            "The NGX workspace addresses a real local-market support gap for Nigerian users.",
        "The AI assistant improves explanatory support during analysis.":
            "AI support reduces the need to leave the page for basic interpretation.",
        "The simulator suggests better modeled decision accuracy and lower decision latency under assisted conditions.":
            "Simulation suggests assisted users perform better on the same modeled path.",
        "Takeaway: the platform improves clarity, local relevance, and modeled decision support.":
            "Takeaway: the strongest visible effects are clarity, continuity, local relevance, and improved modeled decision quality.",
    },
    "ppt/slides/slide14.xml": {
        "A technically complete and academically defensible market-analysis platform with NGX-focused relevance, AI explanation, and simulation-based evaluation.":
            "A technically complete and academically cautious platform that tackles real Nigerian beginner-investor problems through NGX-first visualization, explanation, and simulation.",
        "The project shows how a market visualizer can be designed to support Nigerian-oriented users more clearly and more intelligently.":
            "Most defensible claim: the tool addresses real analysis struggles and may improve how Nigerian-oriented beginners understand market information.",
        "Clearer visualization can support better market understanding for Nigerian-oriented beginners.":
            "Present the effect as likely and modeled, not as nationally proven.",
    },
    "ppt/slides/slide15.xml": {
        "Test the platform with Nigerian students and beginner investors.":
            "Test the tool with Nigerian students and beginner investors.",
        "Add questionnaires and usability measures for direct evaluation.":
            "Measure confusion, confidence, and interpretation quality directly.",
    },
}


def patch_xml(text: str, replacements: dict[str, str], slide_name: str) -> str:
    for old, new in replacements.items():
        old_tag = f"<a:t>{escape(old)}</a:t>"
        new_tag = f"<a:t>{escape(new)}</a:t>"
        if old_tag not in text:
            raise ValueError(f"Could not find expected text in {slide_name!r}: {old!r}")
        text = text.replace(old_tag, new_tag, 1)
    return text


def build() -> None:
    with ZipFile(SOURCE, "r") as zin, ZipFile(OUTPUT, "w", ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename in REPLACEMENTS:
                xml = data.decode("utf-8")
                xml = patch_xml(xml, REPLACEMENTS[info.filename], info.filename)
                data = xml.encode("utf-8")
            zout.writestr(info, data)


if __name__ == "__main__":
    build()
    print(f"Wrote {OUTPUT}")
