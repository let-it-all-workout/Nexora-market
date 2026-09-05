"""Build an APA-leaning .docx seminar report from REPORT_BODY_DRAFT.md without external libs."""

from __future__ import annotations

from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape
import re

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "REPORT_BODY_DRAFT.md"
OUTPUT = ROOT / "Seminar_Report_Submission_Draft.docx"


def parse_inline_runs(text: str) -> list[tuple[str, bool, bool]]:
    pattern = re.compile(r"(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)")
    parts = pattern.split(text)
    runs: list[tuple[str, bool, bool]] = []
    for part in parts:
        if not part:
            continue
        if part.startswith("***") and part.endswith("***") and len(part) >= 6:
            runs.append((part[3:-3], True, True))
        elif part.startswith("**") and part.endswith("**") and len(part) >= 4:
            runs.append((part[2:-2], True, False))
        elif part.startswith("*") and part.endswith("*") and len(part) >= 2:
            runs.append((part[1:-1], False, True))
        else:
            runs.append((part, False, False))
    return runs


def run_xml(
    text: str,
    *,
    bold: bool = False,
    italic: bool = False,
    size_half_points: int | None = None,
) -> str:
    props = [
        '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>',
    ]
    if bold:
        props.append("<w:b/>")
        props.append("<w:bCs/>")
    if italic:
        props.append("<w:i/>")
        props.append("<w:iCs/>")
    if size_half_points is not None:
        props.append(f'<w:sz w:val="{size_half_points}"/>')
        props.append(f'<w:szCs w:val="{size_half_points}"/>')
    prop_xml = f"<w:rPr>{''.join(props)}</w:rPr>" if props else ""
    parts = text.split("\t")
    runs: list[str] = []
    for idx, part in enumerate(parts):
        runs.append(f'<w:r>{prop_xml}<w:t xml:space="preserve">{escape(part)}</w:t></w:r>')
        if idx < len(parts) - 1:
            runs.append(f"<w:r>{prop_xml}<w:tab/></w:r>")
    return "".join(runs)


def paragraph_xml(
    text: str = "",
    *,
    style: str | None = None,
    align: str | None = None,
    page_break_before: bool = False,
    spacing_before: int | None = None,
    spacing_after: int | None = None,
    keep_lines: bool = False,
    default_bold: bool = False,
    default_italic: bool = False,
    default_size_half_points: int = 24,
) -> str:
    ppr = []
    if style:
        ppr.append(f'<w:pStyle w:val="{style}"/>')
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    if page_break_before:
        ppr.append("<w:pageBreakBefore/>")
    if spacing_before is not None or spacing_after is not None:
        attrs = []
        if spacing_before is not None:
            attrs.append(f'w:before="{spacing_before}"')
        if spacing_after is not None:
            attrs.append(f'w:after="{spacing_after}"')
        ppr.append(f"<w:spacing {' '.join(attrs)}/>")
    if keep_lines:
        ppr.append("<w:keepLines/>")
    ppr_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>" if ppr else "<w:pPr/>"
    runs = "".join(
        run_xml(
            chunk,
            bold=default_bold or bold,
            italic=default_italic or italic,
            size_half_points=default_size_half_points,
        )
        for chunk, bold, italic in parse_inline_runs(text)
    ) or run_xml("", size_half_points=default_size_half_points)
    return f"<w:p>{ppr_xml}{runs}</w:p>"


def blank_paragraph(style: str | None = None) -> str:
    if style:
        return f'<w:p><w:pPr><w:pStyle w:val="{style}"/></w:pPr></w:p>'
    return "<w:p><w:pPr/></w:p>"


def page_break_paragraph() -> str:
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def build_document_body(lines: list[str]) -> str:
    body_parts: list[str] = []
    current_section = ""
    in_cover = True
    in_references = False
    for raw in lines:
        line = raw.rstrip()
        stripped = line.strip()

        if not stripped:
            if in_cover:
                body_parts.append(blank_paragraph("CenterBlock"))
            continue

        if stripped == "---":
            in_cover = False
            body_parts.append(page_break_paragraph())
            continue

        if stripped.startswith("# "):
            title = stripped[2:].strip()
            in_references = title.upper() == "REFERENCES"
            body_parts.append(
                paragraph_xml(
                    title,
                    style="Heading1",
                    align="center",
                    spacing_before=0,
                    spacing_after=120,
                    default_bold=True,
                    default_size_half_points=28,
                )
            )
            continue

        if stripped.startswith("## "):
            current_section = stripped[3:].strip().upper()
            style = "SectionHeading"
            align = "center"
            if current_section == "ABSTRACT":
                style = "AbstractHeading"
            body_parts.append(
                paragraph_xml(
                    stripped[3:].strip(),
                    style=style,
                    align=align,
                    spacing_before=0,
                    spacing_after=120,
                    default_bold=True,
                    default_size_half_points=24,
                )
            )
            continue

        if stripped.startswith("### "):
            body_parts.append(
                paragraph_xml(
                    stripped[4:].strip(),
                    style="Heading3",
                    align="left",
                    spacing_before=120,
                    spacing_after=60,
                    default_bold=True,
                    default_size_half_points=24,
                )
            )
            continue

        if current_section == "TABLE OF CONTENTS":
            body_parts.append(
                paragraph_xml(
                    stripped,
                    style="TOCEntry",
                    align="left",
                    keep_lines=True,
                    default_bold=(
                        stripped.startswith("Preliminary Pages")
                        or stripped.startswith("Chapters")
                        or stripped.startswith("Chapter ")
                    ),
                    default_size_half_points=24,
                )
            )
            continue

        if re.match(r"^\d+\.\s+", stripped):
            text = re.sub(r"^\d+\.\s+", "", stripped)
            prefix = stripped[: stripped.index(".") + 1]
            body_parts.append(
                paragraph_xml(
                    f"{prefix} {text}",
                    style="ListParagraph",
                    keep_lines=True,
                    default_size_half_points=24,
                )
            )
            continue

        if stripped.startswith("- "):
            body_parts.append(
                paragraph_xml(
                    f"• {stripped[2:]}",
                    style="ListBullet",
                    keep_lines=True,
                    default_size_half_points=24,
                )
            )
            continue

        if in_references:
            body_parts.append(
                paragraph_xml(
                    stripped,
                    style="Reference",
                    align="left",
                    keep_lines=True,
                    default_size_half_points=24,
                )
            )
            continue

        if in_cover:
            style = "CoverTitle" if stripped.startswith("**") and stripped.endswith("**") else "CenterBlock"
            body_parts.append(
                paragraph_xml(
                    stripped,
                    style=style,
                    align="center",
                    keep_lines=True,
                    default_bold=style == "CoverTitle",
                    default_size_half_points=24,
                )
            )
            continue

        if stripped.lower().startswith("keywords:"):
            body_parts.append(
                paragraph_xml(
                    stripped,
                    style="KeywordParagraph",
                    keep_lines=True,
                    default_size_half_points=24,
                )
            )
            continue

        if stripped.startswith("*Figure ") and stripped.endswith("*"):
            body_parts.append(
                paragraph_xml(
                    stripped,
                    style="FigureCaption",
                    align="center",
                    keep_lines=True,
                    default_italic=True,
                    default_size_half_points=24,
                )
            )
            continue

        if stripped.startswith("**[INSERT SCREENSHOT"):
            body_parts.append(
                paragraph_xml(
                    stripped,
                    style="ScreenshotPlaceholder",
                    align="center",
                    keep_lines=True,
                    default_bold=True,
                    default_italic=True,
                    default_size_half_points=24,
                )
            )
            continue

        body_parts.append(
            paragraph_xml(
                stripped,
                style="BodyText",
                align="both",
                keep_lines=True,
                default_size_half_points=24,
            )
        )

    section = """
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rId1"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
    """
    return "".join(body_parts) + section


def document_xml(body: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 w15 wp14">
  <w:body>{body}</w:body>
</w:document>
"""


CONTENT_TYPES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""


RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""


DOC_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>
"""


HEADER_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:jc w:val="right"/>
    </w:pPr>
    <w:r>
      <w:fldChar w:fldCharType="begin"/>
    </w:r>
    <w:r>
      <w:instrText xml:space="preserve"> PAGE </w:instrText>
    </w:r>
    <w:r>
      <w:fldChar w:fldCharType="end"/>
    </w:r>
  </w:p>
</w:hdr>
"""


STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:color w:val="000000"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
        <w:jc w:val="both"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="BodyText">
    <w:name w:val="Body Text"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
      <w:ind w:firstLine="720"/>
      <w:jc w:val="both"/>
    </w:pPr>
    <w:rPr>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="000000"/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="CoverTitle">
    <w:name w:val="Cover Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="CenterBlock">
    <w:name w:val="Center Block"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
    </w:pPr>
    <w:rPr>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="BodyText"/>
    <w:qFormat/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:line="360" w:lineRule="auto" w:before="120" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:color w:val="000000"/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="SectionHeading">
    <w:name w:val="Section Heading"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="BodyText"/>
    <w:qFormat/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:line="360" w:lineRule="auto" w:before="120" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="AbstractHeading">
    <w:name w:val="Abstract Heading"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="BodyText"/>
    <w:qFormat/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:line="360" w:lineRule="auto" w:before="120" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="Heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="BodyText"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto" w:before="120" w:after="60"/>
      <w:jc w:val="left"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:color w:val="000000"/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
      <w:ind w:left="720" w:hanging="360"/>
      <w:jc w:val="both"/>
    </w:pPr>
    <w:rPr>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListBullet">
    <w:name w:val="List Bullet"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
      <w:ind w:left="720" w:hanging="360"/>
      <w:jc w:val="left"/>
    </w:pPr>
    <w:rPr>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="KeywordParagraph">
    <w:name w:val="Keyword Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
      <w:jc w:val="left"/>
    </w:pPr>
    <w:rPr>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TOCEntry">
    <w:name w:val="TOC Entry"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:tabs>
        <w:tab w:val="right" w:pos="9360"/>
      </w:tabs>
      <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
      <w:jc w:val="left"/>
    </w:pPr>
    <w:rPr>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="FigureCaption">
    <w:name w:val="Figure Caption"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
    </w:pPr>
    <w:rPr>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ScreenshotPlaceholder">
    <w:name w:val="Screenshot Placeholder"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:i/>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Reference">
    <w:name w:val="Reference"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="0"/>
      <w:ind w:left="720" w:hanging="720"/>
      <w:jc w:val="left"/>
    </w:pPr>
    <w:rPr>
      <w:color w:val="000000"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
</w:styles>
"""


CORE_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Seminar Report Submission Draft</dc:title>
  <dc:subject>Market Visualizer Seminar</dc:subject>
  <dc:creator>Codex</dc:creator>
  <cp:keywords>seminar, report, market visualizer, nigeria, APA 7</cp:keywords>
</cp:coreProperties>
"""


APP_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
</Properties>
"""


def build_docx() -> None:
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    body = build_document_body(lines)
    with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES_XML)
        zf.writestr("_rels/.rels", RELS_XML)
        zf.writestr("word/document.xml", document_xml(body))
        zf.writestr("word/styles.xml", STYLES_XML)
        zf.writestr("word/header1.xml", HEADER_XML)
        zf.writestr("word/_rels/document.xml.rels", DOC_RELS_XML)
        zf.writestr("docProps/core.xml", CORE_XML)
        zf.writestr("docProps/app.xml", APP_XML)


if __name__ == "__main__":
    build_docx()
    print(f"Wrote {OUTPUT}")
