"""Generate a polished seminar deck built for live presentation."""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_AUTO_SHAPE_TYPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt

OUTPUT = str(Path(__file__).resolve().parent / "Defence_Deck_Report_Format.pptx")
SCREENSHOT_DIR = Path(__file__).resolve().parent / "screenshots"

NAVY = RGBColor(8, 15, 30)
NAVY_2 = RGBColor(15, 23, 42)
SLATE = RGBColor(51, 65, 85)
MUTED = RGBColor(100, 116, 139)
SOFT = RGBColor(226, 232, 240)
PAPER = RGBColor(248, 250, 252)
WHITE = RGBColor(255, 255, 255)
EMERALD = RGBColor(16, 185, 129)
SKY = RGBColor(14, 165, 233)
AMBER = RGBColor(245, 158, 11)
ROSE = RGBColor(244, 63, 94)


SLIDES = [
    {
        "kind": "hero",
        "eyebrow": "Computer Science Seminar",
        "title": "The Effect of a Market Visualizer on Nigerian Investors",
        "subtitle": "Design, Implementation, and Detector-Based Evaluation",
        "focus_bullets": [
            "Honest charts from named sources",
            "Stocks, crypto, and NGX",
            "Isolation Forest vs 3-sigma",
            "USD to NGN context",
        ],
        "meta": [
            "[Your Full Name]",
            "[Matric Number]  |  [Department]  |  [University]",
            "Supervisor: [Supervisor Name]  |  Session 2024/2025",
        ],
    },
    {
        "kind": "problem",
        "title": "Tangible Struggles Nigerian Beginners Face",
        "bullets": [
            "NGX information is often scattered across broker apps, exchange pages, news sites, WhatsApp groups, and social-media posts.",
            "Many beginners can see prices, but they cannot easily tell whether a move shows trend, volatility, or an unusual day.",
            "Many tools invent a line when history is missing, or claim “AI” without a method you can examine.",
        ],
        "highlight_title": "Without A Local Visualizer",
        "highlight_text": "Analysis becomes fragmented, slow, and easy to misunderstand.",
    },
    {
        "kind": "three_up",
        "section": "Reality",
        "title": "What Happens Without The Tool",
        "cards": [
            ("Scattered Information", "A beginner may jump between exchange pages, headlines, broker screens, and social media before understanding one asset."),
            ("Weak Local Context", "Many platforms are stronger for US markets than NGX, so Nigerian users get less naira-first interpretation."),
            ("Unnamed Methods", "Charts appear without tested indicators or a named unusual-day detector, so “unusual” is just a guess."),
        ],
    },
    {
        "kind": "gallery",
        "section": "Demo",
        "title": "What The Live App Shows",
        "images": ["home.png", "ngx.png", "stock.png"],
        "captions": ["Home: three markets", "NGX in naira", "Stocks: indicators and flags"],
        "footer_text": "Place screenshots in docs/screenshots/. Routes: /, /ngx, /stocks.",
    },
    {
        "kind": "double_image",
        "section": "Demo",
        "title": "Stocks And Crypto On One Chart Stack",
        "images": ["stock.png", "crypto.png"],
        "captions": ["Search, SMA/RSI, compare two names", "Crypto: CoinGecko with Yahoo fallback"],
        "label_left": "Stocks",
        "label_right": "Crypto",
        "footer_text": "If a provider has no history, the chart stays empty.",
    },
    {
        "kind": "impact",
        "section": "Nigeria Lens",
        "title": "Why This Matters In Nigeria",
        "left": [
            "NGX belongs in the same visualizer as US tickers, in naira.",
            "A USD to NGN bar gives FX context without pretending to be a trading desk.",
            "Honest empty charts matter more than a guessed line when Pulse or CoinGecko is down.",
        ],
        "right_title": "Local Need",
        "right_text": "The platform is designed to reduce confusion, restore local context, and keep methods examinable.",
    },
    {
        "kind": "workflow",
        "title": "How A User Moves Through The Tool",
        "steps": [
            "Pick Stocks, Crypto, or NGX",
            "Search a ticker",
            "Plot history or see empty",
            "Overlay tested indicators",
            "Click gold or wine marks",
        ],
    },
    {
        "kind": "architecture",
        "title": "What We Built",
        "nodes": [
            "React + Vite",
            "Express API",
            "Indicators",
            "Isolation Forest",
        ],
        "footer_text": "Yahoo, CoinGecko, NGX Pulse, and FX APIs. 3-sigma is the statistical baseline next to Isolation Forest.",
    },
    {
        "kind": "impact",
        "section": "Alpha Points",
        "title": "How The Visualizer Tackles Each Problem",
        "left": [
            "Scattered information -> Home, Stocks, Crypto, and NGX share one chart stack.",
            "Weak NGX support -> naira workspace plus a USD to NGN bar.",
            "Unnamed methods -> SMA, EMA, RSI, MACD, Bollinger with tests.",
            "“Unusual” without a definition -> gold 3-sigma vs wine Isolation Forest.",
        ],
        "right_title": "Tool Value",
        "right_text": "Detection on the chart in front of you, not a forecast and not a buy or sell signal.",
        "bottom_images": [
            ("home.png", "Home", EMERALD),
            ("ngx.png", "NGX", SKY),
            ("stock.png", "Flags", AMBER),
        ],
    },
    {
        "kind": "single_image",
        "section": "Evaluation",
        "title": "Unusual Days: Isolation Forest vs 3-sigma",
        "image": "stock.png",
        "caption": "Gold ring = 3-sigma. Wine fill = Isolation Forest.",
        "image_label": "Detector",
        "side_title": "Same Chart",
        "side_bullets": [
            "Gold: return or volume > 3σ",
            "Wine: 4-D Isolation Forest",
            "Top 5% score and floor 0.55",
            "Click a mark to read the day",
            "Not a forecast",
        ],
    },
    {
        "kind": "findings",
        "title": "What The Artifact Demonstrates",
        "bullets": [
            "A working visualizer for stocks, crypto, and NGX.",
            "Named providers; empty chart if history is missing.",
            "Tested indicators computed on the bars that arrived.",
            "Isolation Forest compared with a 3-sigma baseline.",
            "USD to NGN for local FX context.",
        ],
        "takeaway": "Takeaway: potential effect is clearer reading of history, not measured trading profit.",
        "bottom_images": [
            ("stock.png", "Charts", SKY),
            ("ngx.png", "NGX", EMERALD),
            ("crypto.png", "Crypto", AMBER),
        ],
    },
    {
        "kind": "limits",
        "title": "Study Boundaries",
        "cards": [
            ("Not a Brokerage", "The platform does not execute trades or give investment instructions."),
            ("Not a Forecast", "Isolation Forest flags unusual bars; it does not predict the next close."),
            ("Not a Field Study", "The effect on Nigerians is inferred from design, not measured in a survey."),
        ],
    },
    {
        "kind": "conclusion",
        "title": "Conclusion",
        "left_title": "Main Contribution",
        "left_text": "A small, examinable visualizer: named data, tested indicators, NGX and FX context, and an unusual-day detector next to a 3-sigma rule.",
        "right_title": "Bottom Line",
        "right_text": "Most defensible claim: the visualizer may help Nigerian-oriented beginners read market history more clearly.",
        "bottom_line": "Present the effect as likely and designed, not as nationally proven.",
    },
    {
        "kind": "closing",
        "title": "Recommendations",
        "bullets": [
            "Test the tool with Nigerian students and beginner investors.",
            "Measure confusion and interpretation quality directly.",
            "Strengthen NGX history coverage; keep refusing next-day forecasts.",
        ],
        "footer": "Thank you",
    },
]


def add_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_shape(slide, shape_type, left, top, width, height, fill_color, line_color=None):
    shape = slide.shapes.add_shape(shape_type, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.color.rgb = line_color or fill_color
    return shape


def add_panel(slide, left, top, width, height, color, line_color=None):
    return add_shape(slide, MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE, left, top, width, height, color, line_color or color)


def add_text(slide, left, top, width, height, text, size=20, color=WHITE, bold=False, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = align
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    return box


def add_bullet_box(slide, left, top, width, height, bullets, size=20, color=SLATE):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    for i, line in enumerate(bullets):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.level = 0
        p.font.size = Pt(size)
        p.font.color.rgb = color
        p.space_after = Pt(12)
    return box


def add_top_bar(slide, section):
    add_shape(slide, MSO_AUTO_SHAPE_TYPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.32), NAVY)
    add_shape(slide, MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE, Inches(0.62), Inches(0.48), Inches(1.7), Inches(0.3), EMERALD)
    add_text(slide, Inches(0.74), Inches(0.515), Inches(1.45), Inches(0.2), section, 13, WHITE, True, PP_ALIGN.CENTER)


def add_footer(slide, page_text):
    add_text(slide, Inches(11.9), Inches(7.02), Inches(1.0), Inches(0.2), page_text, 11, MUTED, False, PP_ALIGN.RIGHT)


def add_image_or_placeholder(slide, left, top, width, height, filename, caption=None):
    path = SCREENSHOT_DIR / filename
    if path.exists():
        slide.shapes.add_picture(str(path), left, top, width=width, height=height)
    else:
        add_panel(slide, left, top, width, height, NAVY_2, NAVY_2)
        add_text(slide, left + Inches(0.2), top + Inches(0.18), width - Inches(0.4), Inches(0.25), "Add Screenshot", 16, WHITE, True)
        add_text(slide, left + Inches(0.2), top + Inches(0.55), width - Inches(0.4), height - Inches(0.8), f"{filename}\n\nPlace this file inside:\n{SCREENSHOT_DIR}", 15, SOFT)
    if caption:
        add_panel(slide, left, top + height - Inches(0.42), width, Inches(0.42), NAVY, NAVY)
        add_text(slide, left + Inches(0.08), top + height - Inches(0.34), width - Inches(0.16), Inches(0.18), caption, 11, WHITE, False, PP_ALIGN.CENTER)


def add_image_label(slide, left, top, text, color=EMERALD):
    add_shape(slide, MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE, left, top, Inches(1.55), Inches(0.28), color)
    add_text(slide, left + Inches(0.05), top + Inches(0.035), Inches(1.45), Inches(0.16), text, 11, WHITE, True, PP_ALIGN.CENTER)


def add_bottom_strip(slide, items, top, width=Inches(3.45), height=Inches(0.78), left=Inches(0.9), gap=Inches(0.28)):
    for idx, (filename, label, color) in enumerate(items):
        x = left + idx * (width + gap)
        add_image_or_placeholder(slide, x, top, width, height, filename)
        add_image_label(slide, x + Inches(0.1), top + Inches(0.08), label, color)


def build_hero(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, NAVY)
    add_shape(slide, MSO_AUTO_SHAPE_TYPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.42), EMERALD)
    add_shape(slide, MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE, Inches(0.7), Inches(0.95), Inches(2.05), Inches(0.36), SKY)
    add_text(slide, Inches(0.88), Inches(1.0), Inches(1.65), Inches(0.2), spec["eyebrow"], 14, WHITE, True, PP_ALIGN.CENTER)
    add_text(slide, Inches(0.72), Inches(1.65), Inches(8.0), Inches(1.2), spec["title"], 28, WHITE, True)
    add_text(slide, Inches(0.74), Inches(2.95), Inches(7.3), Inches(0.45), spec["subtitle"], 19, SOFT)

    add_panel(slide, Inches(0.72), Inches(4.05), Inches(5.7), Inches(1.55), NAVY_2)
    for i, line in enumerate(spec["meta"]):
        add_text(slide, Inches(0.95), Inches(4.28 + (i * 0.34)), Inches(5.1), Inches(0.2), line, 15, WHITE, i == 0)

    add_panel(slide, Inches(8.9), Inches(1.05), Inches(3.7), Inches(4.95), NAVY_2)
    add_shape(slide, MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE, Inches(9.2), Inches(1.42), Inches(2.95), Inches(0.3), AMBER)
    add_text(slide, Inches(9.25), Inches(1.9), Inches(2.8), Inches(0.3), "Presentation Focus", 18, WHITE, True)
    add_bullet_box(
        slide,
        Inches(9.22),
        Inches(2.45),
        Inches(2.95),
        Inches(2.9),
        spec.get(
            "focus_bullets",
            [
                "Real Nigerian struggles",
                "Sneak peek demo of what we are building",
                "How we are building it",
                "Why the effect can matter",
            ],
        ),
        16,
        SOFT,
    )
    add_footer(slide, str(idx))


def build_problem(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, PAPER)
    add_top_bar(slide, "Problem")
    add_text(slide, Inches(0.72), Inches(1.15), Inches(6.8), Inches(0.5), spec["title"], 26, NAVY_2, True)
    add_bullet_box(slide, Inches(0.9), Inches(2.0), Inches(6.2), Inches(3.8), spec["bullets"], 20, SLATE)
    add_panel(slide, Inches(7.8), Inches(1.45), Inches(4.6), Inches(4.6), NAVY)
    add_text(slide, Inches(8.1), Inches(1.85), Inches(4.0), Inches(0.3), spec["highlight_title"], 18, WHITE, True)
    add_text(slide, Inches(8.1), Inches(2.45), Inches(3.9), Inches(2.5), spec["highlight_text"], 24, SOFT, True)
    add_shape(slide, MSO_AUTO_SHAPE_TYPE.OVAL, Inches(10.95), Inches(5.0), Inches(0.28), Inches(0.28), ROSE)
    add_shape(slide, MSO_AUTO_SHAPE_TYPE.OVAL, Inches(11.35), Inches(5.0), Inches(0.28), Inches(0.28), AMBER)
    add_shape(slide, MSO_AUTO_SHAPE_TYPE.OVAL, Inches(11.75), Inches(5.0), Inches(0.28), Inches(0.28), EMERALD)
    add_footer(slide, str(idx))


def build_three_up(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, WHITE)
    add_top_bar(slide, spec.get("section", "Solution"))
    add_text(slide, Inches(0.72), Inches(1.12), Inches(6.8), Inches(0.45), spec["title"], 26, NAVY_2, True)
    positions = [0.72, 4.4, 8.08]
    colors = [NAVY_2, SKY, EMERALD]
    for i, (title, desc) in enumerate(spec["cards"]):
        add_panel(slide, Inches(positions[i]), Inches(2.05), Inches(3.1), Inches(3.95), PAPER if i == 0 else WHITE, SOFT)
        add_shape(slide, MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE, Inches(positions[i] + 0.22), Inches(2.28), Inches(1.15), Inches(0.24), colors[i])
        add_text(slide, Inches(positions[i] + 0.22), Inches(2.68), Inches(2.5), Inches(0.4), title, 18, NAVY_2, True)
        add_text(slide, Inches(positions[i] + 0.22), Inches(3.18), Inches(2.62), Inches(2.35), desc, 16, SLATE)
    add_footer(slide, str(idx))


def build_impact(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, PAPER)
    add_top_bar(slide, spec.get("section", "Nigeria Lens"))
    add_text(slide, Inches(0.72), Inches(1.12), Inches(6.8), Inches(0.45), spec["title"], 26, NAVY_2, True)
    has_strip = bool(spec.get("bottom_images"))
    bullet_height = Inches(3.05) if has_strip else Inches(3.8)
    panel_height = Inches(3.6) if has_strip else Inches(4.3)
    add_bullet_box(slide, Inches(0.92), Inches(2.0), Inches(5.8), bullet_height, spec["left"], 19, SLATE)
    add_panel(slide, Inches(7.55), Inches(1.75), Inches(4.8), panel_height, NAVY)
    add_text(slide, Inches(7.88), Inches(2.02), Inches(3.8), Inches(0.3), spec["right_title"], 18, WHITE, True)
    add_text(slide, Inches(7.88), Inches(2.62), Inches(3.75), Inches(2.3), spec["right_text"], 23, SOFT, True)
    if has_strip:
        add_bottom_strip(slide, spec["bottom_images"], Inches(5.9))
    add_footer(slide, str(idx))


def build_workflow(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, WHITE)
    add_top_bar(slide, "Workflow")
    add_text(slide, Inches(0.72), Inches(1.12), Inches(6.8), Inches(0.45), spec["title"], 26, NAVY_2, True)
    step_width = 2.2
    for i, step in enumerate(spec["steps"]):
        left = 0.75 + i * 2.42
        add_panel(slide, Inches(left), Inches(2.55), Inches(step_width), Inches(2.3), WHITE, SOFT)
        add_shape(slide, MSO_AUTO_SHAPE_TYPE.OVAL, Inches(left + 0.18), Inches(2.78), Inches(0.42), Inches(0.42), EMERALD if i < 4 else SKY)
        add_text(slide, Inches(left + 0.25), Inches(2.86), Inches(0.18), Inches(0.12), str(i + 1), 14, WHITE, True, PP_ALIGN.CENTER)
        add_text(slide, Inches(left + 0.18), Inches(3.45), Inches(1.75), Inches(0.7), step, 18, NAVY_2, True)
        if i < len(spec["steps"]) - 1:
            add_shape(slide, MSO_AUTO_SHAPE_TYPE.CHEVRON, Inches(left + 2.03), Inches(3.38), Inches(0.26), Inches(0.32), SKY)
    add_footer(slide, str(idx))


def build_method(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, PAPER)
    add_top_bar(slide, "Method")
    add_text(slide, Inches(0.72), Inches(1.12), Inches(6.8), Inches(0.45), spec["title"], 26, NAVY_2, True)
    add_panel(slide, Inches(0.85), Inches(2.0), Inches(5.55), Inches(4.2), WHITE, SOFT)
    add_text(slide, Inches(1.12), Inches(2.28), Inches(2.8), Inches(0.3), spec["left_title"], 19, NAVY_2, True)
    add_bullet_box(slide, Inches(1.1), Inches(2.82), Inches(4.7), Inches(2.7), spec["left_items"], 18, SLATE)
    add_panel(slide, Inches(6.8), Inches(2.0), Inches(5.55), Inches(4.2), NAVY, NAVY)
    add_text(slide, Inches(7.08), Inches(2.28), Inches(2.8), Inches(0.3), spec["right_title"], 19, WHITE, True)
    add_bullet_box(slide, Inches(7.05), Inches(2.82), Inches(4.7), Inches(2.7), spec["right_items"], 18, SOFT)
    add_footer(slide, str(idx))


def build_architecture(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, WHITE)
    add_top_bar(slide, "Architecture")
    add_text(slide, Inches(0.72), Inches(1.12), Inches(6.8), Inches(0.45), spec["title"], 26, NAVY_2, True)
    xs = [0.8, 3.5, 6.2, 8.9]
    colors = [NAVY_2, SKY, EMERALD, AMBER]
    for i, node in enumerate(spec["nodes"]):
        add_panel(slide, Inches(xs[i]), Inches(2.8), Inches(2.0), Inches(1.4), WHITE, SOFT)
        add_shape(slide, MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE, Inches(xs[i] + 0.18), Inches(3.0), Inches(1.1), Inches(0.22), colors[i])
        add_text(slide, Inches(xs[i] + 0.18), Inches(3.42), Inches(1.5), Inches(0.45), node, 17, NAVY_2, True)
        if i < len(spec["nodes"]) - 1:
            add_shape(slide, MSO_AUTO_SHAPE_TYPE.CHEVRON, Inches(xs[i] + 2.08), Inches(3.25), Inches(0.35), Inches(0.38), SKY)
    add_text(slide, Inches(0.95), Inches(5.25), Inches(10.5), Inches(0.3), spec["footer_text"], 14, MUTED, True)
    add_footer(slide, str(idx))


def build_gallery(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, WHITE)
    add_top_bar(slide, spec.get("section", "Product Visuals"))
    add_text(slide, Inches(0.72), Inches(1.12), Inches(6.8), Inches(0.45), spec["title"], 26, NAVY_2, True)
    positions = [0.72, 4.35, 7.98]
    for i, image in enumerate(spec["images"]):
        add_image_or_placeholder(slide, Inches(positions[i]), Inches(1.82), Inches(3.05), Inches(4.45), image, spec["captions"][i])
        add_image_label(slide, Inches(positions[i] + 0.16), Inches(1.96), f"View {i + 1}", EMERALD if i != 1 else SKY)
    add_text(slide, Inches(0.8), Inches(6.55), Inches(11.5), Inches(0.22), spec.get("footer_text", "These are the strongest live product views for the presentation."), 12, MUTED)
    add_footer(slide, str(idx))


def build_double_image(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, PAPER)
    add_top_bar(slide, spec.get("section", "Visual Proof"))
    add_text(slide, Inches(0.72), Inches(1.12), Inches(6.8), Inches(0.45), spec["title"], 26, NAVY_2, True)
    add_image_or_placeholder(slide, Inches(0.82), Inches(1.8), Inches(5.85), Inches(4.8), spec["images"][0], spec["captions"][0])
    add_image_or_placeholder(slide, Inches(6.67), Inches(1.8), Inches(5.85), Inches(4.8), spec["images"][1], spec["captions"][1])
    add_image_label(slide, Inches(1.0), Inches(1.95), spec.get("label_left", "Stock Visualizer"), SKY)
    add_image_label(slide, Inches(6.85), Inches(1.95), spec.get("label_right", "Market Context"), EMERALD)
    add_text(slide, Inches(0.92), Inches(6.72), Inches(11.4), Inches(0.22), spec.get("footer_text", "These extra views prove the product has depth beyond a single screen."), 12, MUTED)
    add_footer(slide, str(idx))


def build_single_image(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, PAPER)
    add_top_bar(slide, spec.get("section", "Evaluation"))
    add_text(slide, Inches(0.72), Inches(1.12), Inches(6.8), Inches(0.45), spec["title"], 26, NAVY_2, True)
    add_image_or_placeholder(slide, Inches(0.82), Inches(1.78), Inches(8.55), Inches(5.18), spec["image"], spec["caption"])
    add_image_label(slide, Inches(1.02), Inches(1.94), spec.get("image_label", "Screenshot"), AMBER)
    add_panel(slide, Inches(9.62), Inches(1.78), Inches(2.75), Inches(5.18), NAVY)
    add_text(slide, Inches(9.92), Inches(2.22), Inches(2.1), Inches(0.3), spec.get("side_title", "Simulation Highlights"), 18, WHITE, True)
    add_bullet_box(
        slide,
        Inches(9.9),
        Inches(2.8),
        Inches(2.0),
        Inches(3.3),
        spec.get(
            "side_bullets",
            [
                "User-selected asset",
                "Configurable scenario and duration",
                "Baseline vs assisted comparison",
                "Educational model, not a market forecast",
            ],
        ),
        15,
        SOFT,
    )
    add_footer(slide, str(idx))


def build_findings(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, WHITE)
    add_top_bar(slide, "Findings")
    add_text(slide, Inches(0.72), Inches(1.12), Inches(6.8), Inches(0.45), spec["title"], 26, NAVY_2, True)
    has_strip = bool(spec.get("bottom_images"))
    panel_height = Inches(3.95) if has_strip else Inches(4.85)
    bullets_height = Inches(3.1) if has_strip else Inches(4.0)
    takeaway_top = Inches(5.45) if has_strip else Inches(6.35)
    add_panel(slide, Inches(0.9), Inches(1.95), Inches(11.6), panel_height, PAPER, SOFT)
    add_bullet_box(slide, Inches(1.18), Inches(2.28), Inches(10.7), bullets_height, spec["bullets"], 21, SLATE)
    add_text(slide, Inches(0.95), takeaway_top, Inches(10.8), Inches(0.25), spec.get("takeaway", "Takeaway: the platform improves clarity, local relevance, and modeled decision support."), 13, MUTED, True)
    if has_strip:
        add_bottom_strip(slide, spec["bottom_images"], Inches(5.9))
    add_footer(slide, str(idx))


def build_limits(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, PAPER)
    add_top_bar(slide, "Limits")
    add_text(slide, Inches(0.72), Inches(1.12), Inches(6.8), Inches(0.45), spec["title"], 26, NAVY_2, True)
    positions = [0.72, 4.4, 8.08]
    colors = [AMBER, ROSE, SKY]
    for i, (title, desc) in enumerate(spec["cards"]):
        add_panel(slide, Inches(positions[i]), Inches(2.0), Inches(3.1), Inches(3.95), WHITE, SOFT)
        add_shape(slide, MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE, Inches(positions[i] + 0.22), Inches(2.28), Inches(1.15), Inches(0.24), colors[i])
        add_text(slide, Inches(positions[i] + 0.22), Inches(2.68), Inches(2.5), Inches(0.4), title, 18, NAVY_2, True)
        add_text(slide, Inches(positions[i] + 0.22), Inches(3.18), Inches(2.62), Inches(2.3), desc, 16, SLATE)
    add_footer(slide, str(idx))


def build_conclusion(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, NAVY)
    add_shape(slide, MSO_AUTO_SHAPE_TYPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.32), EMERALD)
    add_text(slide, Inches(0.72), Inches(1.0), Inches(6.8), Inches(0.45), spec["title"], 28, WHITE, True)
    has_strip = bool(spec.get("bottom_images"))
    panel_height = Inches(3.75) if has_strip else Inches(4.5)
    add_panel(slide, Inches(0.78), Inches(1.95), Inches(5.8), panel_height, NAVY_2)
    add_text(slide, Inches(1.05), Inches(2.25), Inches(2.5), Inches(0.3), spec["left_title"], 18, WHITE, True)
    add_text(slide, Inches(1.05), Inches(2.85), Inches(4.9), Inches(2.8), spec["left_text"], 21, SOFT)
    add_panel(slide, Inches(6.95), Inches(1.95), Inches(5.6), panel_height, WHITE, WHITE)
    add_text(slide, Inches(7.25), Inches(2.25), Inches(2.5), Inches(0.3), spec["right_title"], 18, NAVY_2, True)
    add_text(slide, Inches(7.25), Inches(2.85), Inches(4.7), Inches(2.8), spec["right_text"], 24, NAVY_2, True)
    bottom_line_top = Inches(5.1) if has_strip else Inches(5.85)
    add_text(slide, Inches(7.25), bottom_line_top, Inches(4.7), Inches(0.35), spec.get("bottom_line", "Clearer visualization can support better market understanding for Nigerian-oriented beginners."), 12, MUTED, True)
    if has_strip:
        add_bottom_strip(slide, spec["bottom_images"], Inches(5.9))
    add_footer(slide, str(idx))


def build_closing(prs, spec, idx):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, WHITE)
    add_top_bar(slide, "Close")
    add_text(slide, Inches(0.72), Inches(1.12), Inches(7.5), Inches(0.45), spec["title"], 26, NAVY_2, True)
    add_bullet_box(slide, Inches(0.95), Inches(2.0), Inches(7.0), Inches(3.8), spec["bullets"], 21, SLATE)
    add_panel(slide, Inches(8.7), Inches(2.0), Inches(3.8), Inches(3.8), NAVY, NAVY)
    add_text(slide, Inches(9.05), Inches(2.65), Inches(3.0), Inches(0.6), spec["footer"], 30, WHITE, True)
    add_text(slide, Inches(9.08), Inches(3.4), Inches(2.8), Inches(1.4), "Questions\nand discussion", 20, SOFT, True, PP_ALIGN.CENTER)
    if spec.get("bottom_images"):
        add_bottom_strip(slide, spec["bottom_images"], Inches(5.95), width=Inches(5.2), height=Inches(0.72), left=Inches(0.95), gap=Inches(0.38))
    add_footer(slide, str(idx))


def build():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    builders = {
        "hero": build_hero,
        "problem": build_problem,
        "three_up": build_three_up,
        "impact": build_impact,
        "workflow": build_workflow,
        "architecture": build_architecture,
        "method": build_method,
        "gallery": build_gallery,
        "double_image": build_double_image,
        "single_image": build_single_image,
        "findings": build_findings,
        "limits": build_limits,
        "conclusion": build_conclusion,
        "closing": build_closing,
    }

    for idx, spec in enumerate(SLIDES, start=1):
        builders[spec["kind"]](prs, spec, idx)

    prs.save(OUTPUT)
    print(f"Wrote {OUTPUT} ({len(SLIDES)} slides)")


if __name__ == "__main__":
    build()
