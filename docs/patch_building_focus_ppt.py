"""Stale patcher. Do not run. Rebuild from build_seminar_ppt.py instead."""

from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "Defence_Deck_Report_Format.pptx"
TEMP_OUTPUT = ROOT / "Defence_Deck_Report_Format.updated.pptx"

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

ET.register_namespace("a", NS["a"])
ET.register_namespace("p", NS["p"])
ET.register_namespace("r", NS["r"])

STRING_REPLACEMENTS = {
    "ppt/slides/slide1.xml": {
        "How the tool tackles them": "Sneak peek demo of what we are building",
        "How it was built and evaluated": "How we are building it",
        "What the simulation suggests": "Why the effect can matter",
    },
    "ppt/slides/slide2.xml": {
        "Foreign-first tools often give weak NGX context, so Nigerian users must combine several sources by themselves.":
            "Many users end up relying on social-media tips and fragmented headlines instead of structured market context.",
    },
    "ppt/slides/slide3.xml": {
        "Guesswork And Rumor": "TikTok And Rumor Advice",
        "When charts are not explained clearly, users may depend on hype, informal commentary, or incomplete understanding.":
            "When charts and headlines are not grouped clearly, users may depend on influencer takes, rumor, or incomplete understanding.",
    },
    "ppt/slides/slide4.xml": {
        "Response": "Sneak Peek",
        "How The Tool Responds To Those Problems": "Sneak Peek Demo Of What We Are Building",
        "One place to start and navigate": "Sneak peek: one place to start",
        "NGX-focused local workflow": "Sneak peek: NGX-first local workflow",
        "AI explains what the user is seeing": "Sneak peek: AI explanation inside analysis",
        "Response 1": "View 1",
        "Response 2": "View 2",
        "Response 3": "View 3",
        "The tool responds through centralization, local context, and in-flow explanation.":
            "These sneak-peek views show one grouped workflow with local context and in-flow explanation.",
    },
    "ppt/slides/slide5.xml": {
        "Product Depth": "Sneak Peek",
        "What Was Actually Built": "What We Are Building",
        "Multi-asset analysis workspace": "Grouped analysis workspace",
        "Broader market and news context": "Broader market headlines and context",
        "Analysis Workspace": "Grouped Analysis",
        "Research Context": "Macro Context",
        "These additional screens show the product has depth beyond one page.":
            "These additional screens are sneak-peek demo views of grouped analysis, headlines, and research context.",
    },
    "ppt/slides/slide6.xml": {
        "A clearer NGX-first platform may reduce confusion and support more careful learning.":
            "A clearer NGX-first platform may push users toward headlines, macro context, and structured interpretation instead of TikTok-style advice.",
        "The platform is designed to reduce confusion, restore local context, and make Nigerian market analysis easier to understand.":
            "The platform is designed to reduce confusion, restore local context, and guide users toward clearer market interpretation.",
    },
    "ppt/slides/slide7.xml": {
        "Read charts and market context": "Read grouped chart sections",
        "Review page-related news": "Read top headlines and market context",
    },
    "ppt/slides/slide8.xml": {
        "What We Built": "What We Are Building",
        "Built as one connected system so analysis, explanation, and evaluation stay together.":
            "We are building one grouped workflow so users move from chart to headlines to explanation to simulation.",
    },
    "ppt/slides/slide9.xml": {
        "How It Was Built And Evaluated": "How We Are Building And Evaluating It",
    },
    "ppt/slides/slide10.xml": {
        "Problem Mapping": "Alpha Points",
        "How Our Tool Tackles Each Problem": "How The Visualizer Tackles Each Problem",
        "Tool Response": "Tool Value",
        "The tool is designed to turn confusion into clearer analysis, local meaning, and better modeled decision support.":
            "The visualizer is designed to turn scattered noise into grouped analysis, local meaning, macro context, and better modeled decision support.",
    },
    "ppt/slides/slide12.xml": {
        "Findings": "Expected Effect",
        "Tangible Outcomes": "Effects We Expect To See",
        "Takeaway: the strongest visible effects are clarity, continuity, local relevance, and improved modeled decision quality.":
            "Takeaway: the strongest expected effects are clarity, macro awareness, local relevance, and improved modeled decision quality.",
    },
    "ppt/slides/slide14.xml": {
        "A technically complete and academically cautious platform that tackles real Nigerian beginner-investor problems through NGX-first visualization, explanation, and simulation.":
            "What we are building is an academically cautious platform that tackles real Nigerian beginner-investor problems through grouped sections, NGX-first visualization, headline context, and simulation.",
        "Most defensible claim: the tool addresses real analysis struggles and may improve how Nigerian-oriented beginners understand market information.":
            "Most defensible claim: the visualizer may move users away from scattered tips and toward clearer, more structured market understanding.",
    },
}

PARAGRAPH_REPLACEMENTS = {
    "ppt/slides/slide10.xml": (
        "Scattered information -> one workflow connects charts, context, news, and simulation.",
        [
            "Scattered information -> grouped sections keep charts, headlines, news, AI explanation, and simulation in one flow.",
            "Weak NGX support -> the NGX workspace adds naira-native and local-market analysis.",
            "TikTok-style advice -> Top Headlines and broader news context push the user toward macro understanding before reacting.",
            "Poor explanation -> AI support helps users understand terms, moves, and risk without leaving the page.",
        ],
    ),
    "ppt/slides/slide12.xml": (
        "The system successfully centralizes charts, context, explanation, and simulation in one workflow.",
        [
            "Grouped sections may help users move from raw prices to structured understanding.",
            "Top Headlines and broader news context may help users think in macro terms instead of social-media tips.",
            "The NGX workspace may improve local relevance and confidence for Nigerian-oriented users.",
            "AI support may reduce confusion around trend, volatility, and risk.",
            "Simulation suggests assisted users perform better on the same modeled path.",
        ],
    ),
}


def replace_text_nodes(root: ET.Element, replacements: dict[str, str], slide_name: str) -> None:
    text_nodes = root.findall(".//a:t", NS)
    for old, new in replacements.items():
        for node in text_nodes:
            if node.text == old:
                node.text = new
                break
        else:
            raise ValueError(f"Could not find expected text in {slide_name}: {old!r}")


def replace_paragraph_box(root: ET.Element, marker: str, new_paragraphs: list[str], slide_name: str) -> None:
    for shape in root.findall(".//p:sp", NS):
        texts = [node.text for node in shape.findall(".//a:t", NS)]
        if marker not in texts:
            continue

        tx_body = shape.find("p:txBody", NS)
        if tx_body is None:
            raise ValueError(f"Text shape missing txBody in {slide_name}")

        paragraphs = tx_body.findall("a:p", NS)
        if not paragraphs:
            raise ValueError(f"No paragraphs found in {slide_name}")

        template = paragraphs[0]
        for paragraph in paragraphs:
            tx_body.remove(paragraph)

        for text in new_paragraphs:
            paragraph = deepcopy(template)
            text_nodes = paragraph.findall(".//a:t", NS)
            if not text_nodes:
                raise ValueError(f"Template paragraph missing text run in {slide_name}")
            text_nodes[0].text = text
            for node in text_nodes[1:]:
                node.text = ""
            tx_body.append(paragraph)
        return

    raise ValueError(f"Could not find paragraph box marker in {slide_name}: {marker!r}")


def patch_slide(filename: str, data: bytes) -> bytes:
    root = ET.fromstring(data)

    if filename in STRING_REPLACEMENTS:
        replace_text_nodes(root, STRING_REPLACEMENTS[filename], filename)

    if filename in PARAGRAPH_REPLACEMENTS:
        marker, paragraphs = PARAGRAPH_REPLACEMENTS[filename]
        replace_paragraph_box(root, marker, paragraphs, filename)

    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def build() -> None:
    with ZipFile(SOURCE, "r") as zin, ZipFile(TEMP_OUTPUT, "w", ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename in STRING_REPLACEMENTS or info.filename in PARAGRAPH_REPLACEMENTS:
                data = patch_slide(info.filename, data)
            zout.writestr(info, data)

    TEMP_OUTPUT.replace(SOURCE)
    print(f"Updated {SOURCE}")


if __name__ == "__main__":
    build()
