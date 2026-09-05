"""Stale patcher. Do not run. Rebuild from build_seminar_ppt.py instead."""

from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "Defence_Deck_Report_Format.pptx"
OUTPUT = ROOT / "Defence_Deck_Report_Format_EFFECT_FOCUSED.pptx"

REPLACEMENTS = {
    "ppt/slides/slide2.xml": {
        "Nigerian beginners need a clearer, more local, more explainable way to analyze markets.":
            "Effect here means likely improvement in understanding and modeled decision support, not proven nationwide impact.",
    },
    "ppt/slides/slide3.xml": {
        "Charts, market context, related news, and clearer asset analysis across NGX, stocks, crypto, and commodities.":
            "Clearer charts, market context, and related news across NGX, stocks, crypto, and commodities.",
        "An embedded assistant that explains terms, market moves, and page context in simpler language.":
            "An embedded assistant that may reduce confusion by explaining terms, moves, and page context in simpler language.",
        "A modeling layer that compares baseline decision behavior with visualizer-assisted behavior.":
            "A modeling layer that tests the likely effect of the visualizer on baseline versus assisted decision behavior.",
    },
    "ppt/slides/slide4.xml": {
        "These are the strongest live product views for the presentation.":
            "These screens show where the likely effect on clarity and explanation begins.",
    },
    "ppt/slides/slide5.xml": {
        "These extra views prove the product has depth beyond a single screen.":
            "These extra views show the wider workflow that supports the platform's likely effect.",
    },
    "ppt/slides/slide6.xml": {
        "A local-market-first design can improve confidence, orientation, and financial understanding.":
            "A local-market-first design may improve confidence, orientation, and financial understanding.",
        "Seminar Claim":
            "Effect Pathway",
        "The platform may improve accessibility, understanding, and modeled decision support for Nigerian-oriented users, especially beginners.":
            "Local relevance, clearer visuals, and explanation support may produce a stronger learning and analysis experience for Nigerian beginners.",
    },
    "ppt/slides/slide7.xml": {
        "Send the asset into simulation":
            "Compare baseline vs assisted outcomes",
    },
    "ppt/slides/slide8.xml": {
        "Frontend, explanation, and modeling are connected inside one product workflow.":
            "Visualization, explanation, and simulation are connected so the effect can be explored inside one workflow.",
    },
    "ppt/slides/slide9.xml": {
        "Case-based observation":
            "Case-based observation of workflows",
        "Simulation-based comparison":
            "Simulation-based comparison of effect",
    },
    "ppt/slides/slide10.xml": {
        "Nigeria Lens":
            "Effect",
        "Why NGX Focus Matters":
            "How The Visualizer Produces Effect",
        "The local-market angle gives the project strong Nigerian relevance.":
            "Clearer chart structure reduces interpretive burden for beginners.",
        "Naira-native analysis makes the interface feel more meaningful for local users.":
            "NGX-first context improves local meaning and usability.",
        "NGX-first support helps reduce the gap between foreign-market tools and local-market understanding.":
            "AI explanation helps users connect numbers, news, and risk.",
        "Local Value":
            "Mechanism",
        "The project is not just a general market tool. It is designed to make Nigerian market analysis more understandable and more accessible.":
            "The expected effect begins with better understanding, then extends to better modeled decision quality under assisted conditions.",
    },
    "ppt/slides/slide11.xml": {
        "Simulation":
            "Effect Model",
        "Simulation Highlights":
            "Measured Example",
        "User-selected asset":
            "Bull scenario | 400 trials | seed 2026",
        "Configurable scenario and duration":
            "Accuracy: 56.1% -> 70.3%",
        "Baseline vs assisted comparison":
            "Latency: 7.70 -> 6.00",
        "Educational model, not a market forecast":
            "Risk: 0.540 -> 0.420 | Return: 0.065 -> 0.182",
    },
    "ppt/slides/slide12.xml": {
        "The platform successfully combines market analysis, explanation, and simulation in one workflow.":
            "The platform successfully combines visualization, explanation, and simulation in one workflow.",
        "The NGX workspace gives the project strong local relevance and a clearer Nigerian-market angle.":
            "The strongest inferred effects are better clarity, stronger local relevance, and better in-flow explanation for Nigerian beginners.",
        "The AI assistant improves explanatory support during analysis.":
            "A representative Monte Carlo run showed about +14.2 percentage-point decision accuracy and about -1.70 decision latency under assistance.",
        "The simulator suggests better modeled decision accuracy and lower decision latency under assisted conditions.":
            "Scenario-matrix results kept the direction of effect positive across bull, bear, sideways, and shock settings.",
        "Takeaway: the platform improves clarity, local relevance, and modeled decision support.":
            "Takeaway: the prototype suggests positive modeled effect, but real-world Nigerian user testing is still future work.",
    },
    "ppt/slides/slide14.xml": {
        "A technically complete and academically defensible market-analysis platform with NGX-focused relevance, AI explanation, and simulation-based evaluation.":
            "A technically complete and academically cautious market-analysis platform with NGX relevance, AI explanation, and simulation-based evidence of likely effect.",
        "The project shows how a market visualizer can be designed to support Nigerian-oriented users more clearly and more intelligently.":
            "Most defensible claim: the prototype may improve how Nigerian-oriented beginners understand market information and may improve modeled decision support.",
        "Clearer visualization can support better market understanding for Nigerian-oriented beginners.":
            "Effect should be presented as likely and modeled, not as nationally proven.",
    },
    "ppt/slides/slide15.xml": {
        "Test the platform with Nigerian students and beginner investors.":
            "Test the effect directly with Nigerian students and beginner investors.",
        "Add questionnaires and usability measures for direct evaluation.":
            "Add questionnaires and usability measures for stronger evidence.",
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
