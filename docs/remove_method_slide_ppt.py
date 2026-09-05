"""Stale patcher. Do not run. Rebuild from build_seminar_ppt.py instead."""

from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
PPTX = ROOT / "Defence_Deck_Report_Format.pptx"
TMP = ROOT / "Defence_Deck_Report_Format.without_method.pptx"

P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"

NS = {"p": P_NS, "r": R_NS, "a": A_NS}

ET.register_namespace("p", P_NS)
ET.register_namespace("r", R_NS)
ET.register_namespace("a", A_NS)
ET.register_namespace("", PKG_NS)

SLIDE_REL_ID_TO_REMOVE = "rId15"
FOOTER_RENUMBER = {
    "ppt/slides/slide10.xml": "9",
    "ppt/slides/slide11.xml": "10",
    "ppt/slides/slide12.xml": "11",
    "ppt/slides/slide13.xml": "12",
    "ppt/slides/slide14.xml": "13",
    "ppt/slides/slide15.xml": "14",
}


def remove_slide_reference(xml_bytes: bytes) -> bytes:
    root = ET.fromstring(xml_bytes)
    slide_list = root.find("p:sldIdLst", NS)
    if slide_list is None:
        raise ValueError("presentation.xml missing slide list")

    target = None
    for child in slide_list.findall("p:sldId", NS):
        if child.attrib.get(f"{{{R_NS}}}id") == SLIDE_REL_ID_TO_REMOVE:
            target = child
            break

    if target is None:
        raise ValueError(f"Could not find slide reference {SLIDE_REL_ID_TO_REMOVE}")

    slide_list.remove(target)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def remove_slide_relationship(xml_bytes: bytes) -> bytes:
    root = ET.fromstring(xml_bytes)
    target = None
    for child in root.findall(f"{{{PKG_NS}}}Relationship"):
        if child.attrib.get("Id") == SLIDE_REL_ID_TO_REMOVE:
            target = child
            break

    if target is None:
        raise ValueError(f"Could not find relationship {SLIDE_REL_ID_TO_REMOVE}")

    root.remove(target)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def renumber_footer(xml_bytes: bytes, new_page_text: str, slide_name: str) -> bytes:
    root = ET.fromstring(xml_bytes)
    text_nodes = root.findall(".//a:t", NS)
    if not text_nodes:
        raise ValueError(f"No text nodes found in {slide_name}")

    last = text_nodes[-1]
    if not last.text or not last.text.isdigit():
        raise ValueError(f"Last text node in {slide_name} is not a footer number: {last.text!r}")

    last.text = new_page_text
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def build() -> None:
    with ZipFile(PPTX, "r") as zin, ZipFile(TMP, "w", ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)

            if info.filename == "ppt/presentation.xml":
                data = remove_slide_reference(data)
            elif info.filename == "ppt/_rels/presentation.xml.rels":
                data = remove_slide_relationship(data)
            elif info.filename in FOOTER_RENUMBER:
                data = renumber_footer(data, FOOTER_RENUMBER[info.filename], info.filename)

            zout.writestr(info, data)

    TMP.replace(PPTX)
    print(f"Updated {PPTX}")


if __name__ == "__main__":
    build()
