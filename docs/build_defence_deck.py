"""Nexora Markets defence deck — mixed light/dark theme, real app screenshots, bold readable typography."""

from __future__ import annotations

from pathlib import Path

from lxml import etree
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml import parse_xml
from pptx.oxml.ns import nsdecls, qn
from pptx.util import Inches, Pt

OUT = Path(__file__).resolve().parent / "Defence_Presentation.pptx"
FIG = Path(__file__).resolve().parent / "report" / "figures"
ASSETS = Path(__file__).resolve().parent / "ppt_assets"
ASSETS.mkdir(exist_ok=True)

WHITE = RGBColor(255, 255, 255)
BLUE = RGBColor(59, 130, 246)
TEAL = RGBColor(20, 184, 166)
AMBER = RGBColor(245, 158, 11)
RED = RGBColor(239, 68, 68)
NAVY_DEEP = RGBColor(15, 30, 70)

DARK = {
    "name": "dark",
    "card": RGBColor(17, 25, 45),
    "alt": RGBColor(23, 35, 62),
    "line": RGBColor(56, 76, 112),
    "title": WHITE,
    "body": RGBColor(236, 242, 249),
    "muted": RGBColor(186, 202, 224),
    "foot": RGBColor(191, 206, 226),
    "shadow": ("000000", 45000),
    "soft": {
        str(BLUE): RGBColor(18, 34, 68),
        str(TEAL): RGBColor(15, 42, 54),
        str(AMBER): RGBColor(48, 35, 18),
        str(RED): RGBColor(54, 24, 37),
    },
    "hl": {
        str(BLUE): RGBColor(147, 197, 253),
        str(TEAL): RGBColor(94, 234, 212),
        str(AMBER): RGBColor(253, 224, 71),
        str(RED): RGBColor(252, 165, 165),
    },
}

LIGHT = {
    "name": "light",
    "card": WHITE,
    "alt": RGBColor(247, 250, 254),
    "line": RGBColor(214, 224, 239),
    "title": RGBColor(15, 23, 42),
    "body": RGBColor(51, 65, 85),
    "muted": RGBColor(100, 116, 139),
    "foot": RGBColor(71, 85, 105),
    "shadow": ("0F172A", 20000),
    "soft": {
        str(BLUE): RGBColor(232, 240, 254),
        str(TEAL): RGBColor(224, 247, 243),
        str(AMBER): RGBColor(254, 243, 224),
        str(RED): RGBColor(254, 232, 232),
    },
    "hl": {
        str(BLUE): RGBColor(29, 78, 216),
        str(TEAL): RGBColor(15, 118, 110),
        str(AMBER): RGBColor(180, 83, 9),
        str(RED): RGBColor(185, 28, 28),
    },
}

T = DARK

W, H = Inches(13.333), Inches(7.5)
PX_W, PX_H = 1920, 1080
BAND_PX = 202


def I(v):
    return Inches(v)


def soft(accent):
    return T["soft"][str(accent)]


def hl(accent):
    return T["hl"][str(accent)]


# ---------------------------------------------------------------- image assets


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(w, h, c1, c2, diagonal=True):
    steps = 96
    strip = Image.new("RGB", (steps, steps))
    pix = strip.load()
    for y in range(steps):
        for x in range(steps):
            t = (x + y) / (2 * (steps - 1)) if diagonal else x / (steps - 1)
            pix[x, y] = lerp(c1, c2, t)
    return strip.resize((w, h), Image.Resampling.BICUBIC).convert("RGBA")


def dot_grid(draw, color, top=0, step=36, r=1.6):
    for y in range(top + step // 2, PX_H, step):
        for x in range(step // 2, PX_W, step):
            draw.ellipse((x - r, y - r, x + r, y + r), fill=color)


def make_dark_bg(path: Path, c1, c2, glow=(59, 130, 246), glow2=(20, 184, 166)):
    img = gradient(PX_W, PX_H, c1, c2)
    over = Image.new("RGBA", (PX_W, PX_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    dot_grid(d, (255, 255, 255, 10))
    glow_layer = Image.new("RGBA", (PX_W, PX_H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow_layer)
    g.ellipse((PX_W - 760, -420, PX_W + 260, 520), fill=glow + (70,))
    g.ellipse((-380, PX_H - 420, 520, PX_H + 380), fill=glow2 + (55,))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(160))
    img = Image.alpha_composite(img, glow_layer)
    img = Image.alpha_composite(img, over)
    top = gradient(PX_W, 6, (59, 130, 246), (20, 184, 166), diagonal=False)
    img.paste(top, (0, 0))
    img.convert("RGB").save(path, quality=94)


def make_light_bg(path: Path):
    img = gradient(PX_W, PX_H, (249, 251, 254), (232, 240, 251))
    glow_layer = Image.new("RGBA", (PX_W, PX_H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow_layer)
    g.ellipse((PX_W - 620, PX_H - 520, PX_W + 300, PX_H + 360), fill=(20, 184, 166, 40))
    g.ellipse((-300, 240, 520, 1000), fill=(59, 130, 246, 26))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(140))
    img = Image.alpha_composite(img, glow_layer)
    over = Image.new("RGBA", (PX_W, PX_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    dot_grid(d, (148, 163, 184, 60), top=BAND_PX + 10)
    img = Image.alpha_composite(img, over)

    band = gradient(PX_W, BAND_PX, (8, 14, 32), (24, 52, 112), diagonal=False)
    bd = ImageDraw.Draw(band)
    for x in range(-BAND_PX, PX_W, 46):
        bd.line((x, BAND_PX, x + BAND_PX, 0), fill=(255, 255, 255, 9), width=2)
    bglow = Image.new("RGBA", (PX_W, BAND_PX), (0, 0, 0, 0))
    ImageDraw.Draw(bglow).ellipse((PX_W - 700, -260, PX_W + 100, 300), fill=(20, 184, 166, 60))
    band = Image.alpha_composite(band, bglow.filter(ImageFilter.GaussianBlur(90)))
    img.paste(band, (0, 0))
    stripe_h = 9
    stripe = Image.new("RGBA", (PX_W, stripe_h))
    sp = stripe.load()
    stops = [(59, 130, 246), (20, 184, 166), (245, 158, 11)]
    for x in range(PX_W):
        t = x / (PX_W - 1)
        c = lerp(stops[0], stops[1], t * 2) if t < 0.5 else lerp(stops[1], stops[2], (t - 0.5) * 2)
        for y in range(stripe_h):
            sp[x, y] = c + (255,)
    img.paste(stripe, (0, BAND_PX))
    img.convert("RGB").save(path, quality=94)


def _font(size: int, bold: bool = False):
    name = "LiberationSans-Bold.ttf" if bold else "LiberationSans-Regular.ttf"
    for root in ("/usr/share/fonts/truetype/liberation2", "/usr/share/fonts/truetype/liberation"):
        p = Path(root) / name
        if p.exists():
            return ImageFont.truetype(str(p), size=size)
    return ImageFont.load_default()


def make_arch_diagram(path: Path):
    img = Image.new("RGB", (1400, 760), (13, 20, 36))
    draw = ImageDraw.Draw(img)
    f_title = _font(31, True)
    f_body = _font(26, True)
    f_sub = _font(23, False)

    def box(xy, fill, outline):
        draw.rounded_rectangle(xy, radius=22, fill=fill, outline=outline, width=4)

    def label(xy, text, fill=(255, 255, 255), font=f_body):
        draw.text(xy, text, fill=fill, font=font)

    box((36, 28, 1364, 195), (20, 36, 70), (59, 130, 246))
    box((36, 268, 1364, 460), (16, 44, 56), (20, 184, 166))
    box((36, 535, 855, 730), (46, 34, 20), (245, 158, 11))
    box((895, 535, 1364, 730), (50, 24, 36), (239, 68, 68))

    label((70, 52), "1. WEB SCREEN  (React)", (147, 197, 253), f_title)
    label((70, 118), "Home  ·  NGX (Naira)  ·  US Stocks  ·  Forecast  ·  Learn", (255, 255, 255), f_body)

    label((70, 290), "2. SERVER BRAIN  (Node.js / Express)", (94, 234, 212), f_title)
    label((70, 350), "Cleans data  ·  Unusual-day checks  ·  Liquidity  ·  Forecast", (255, 255, 255), f_body)
    label((70, 404), "Hides API keys and computes all maths on the server", (203, 213, 225), f_sub)

    label((70, 558), "3A. LIVE MARKET FEEDS", (253, 224, 71), f_title)
    label((70, 618), "NGX Pulse  ·  Yahoo Finance  ·  FX", (255, 255, 255), f_body)
    label((70, 670), "Real sources — never invented prices", (203, 213, 225), f_sub)

    label((925, 558), "3B. ACCOUNTS", (252, 165, 165), f_title)
    label((925, 618), "Supabase DB", (255, 255, 255), f_body)
    label((925, 670), "Private watchlists", (203, 213, 225), f_sub)

    for x in (260, 560, 860, 1140):
        draw.line((x, 195, x, 268), fill=(96, 165, 250), width=5)
        draw.polygon([(x - 10, 254), (x + 10, 254), (x, 268)], fill=(96, 165, 250))
    draw.line((420, 460, 420, 535), fill=(45, 212, 191), width=5)
    draw.polygon([(410, 521), (430, 521), (420, 535)], fill=(45, 212, 191))
    draw.line((1130, 460, 1130, 535), fill=(248, 113, 113), width=5)
    draw.polygon([(1120, 521), (1140, 521), (1130, 535)], fill=(248, 113, 113))
    img.filter(ImageFilter.SMOOTH_MORE).save(path, quality=95)


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return m


def make_framed_shot(src: Path, dst: Path, label_url: str, crop_top: int = 0, crop_h: int | None = None, light=False):
    """Wrap a screenshot in a browser window frame (light or dark chrome) with rounded transparent corners.

    crop_top must clear the app's top nav, which still lists the removed Crypto page.
    """
    raw = Image.open(src).convert("RGB")
    bottom = raw.height if crop_h is None else min(raw.height, crop_top + crop_h)
    raw = raw.crop((0, crop_top, raw.width, bottom))
    target_w = 1440
    target_h = int(raw.height * (target_w / raw.width))
    raw = raw.resize((target_w, target_h), Image.Resampling.LANCZOS)

    bar_h, pad = 58, 14
    w_out, h_out = target_w + pad * 2, target_h + bar_h + pad * 2
    if light:
        body, outline, pill, pill_line, url_col = (241, 245, 249), (203, 213, 225), (255, 255, 255), (203, 213, 225), (51, 65, 85)
    else:
        body, outline, pill, pill_line, url_col = (19, 28, 49), (59, 130, 246), (11, 18, 34), (56, 76, 112), (191, 219, 254)

    canvas = Image.new("RGBA", (w_out, h_out), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((1, 1, w_out - 2, h_out - 2), radius=26, fill=body + (255,), outline=outline + (255,), width=3)
    for idx, col in enumerate([(239, 68, 68), (245, 158, 11), (16, 185, 129)]):
        cx, cy = 38 + idx * 28, bar_h // 2 + 6
        draw.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), fill=col)
    pill_w = 600
    px1 = (w_out - pill_w) // 2
    draw.rounded_rectangle((px1, 13, px1 + pill_w, bar_h - 4), radius=14, fill=pill, outline=pill_line, width=2)
    draw.text((px1 + 26, 21), label_url, fill=url_col, font=_font(22, True))

    shot = raw.convert("RGBA")
    shot.putalpha(rounded_mask(shot.size, 14))
    canvas.alpha_composite(shot, (pad, bar_h + pad // 2))
    canvas.save(dst)


def make_thumb(src: Path, dst: Path, y0: int, ratio: float):
    raw = Image.open(src).convert("RGB")
    h = int(raw.width * ratio)
    crop = raw.crop((0, y0, raw.width, min(raw.height, y0 + h)))
    crop = crop.resize((960, int(960 * crop.height / crop.width)), Image.Resampling.LANCZOS).convert("RGBA")
    crop.putalpha(rounded_mask(crop.size, 22))
    crop.save(dst)


THUMB_RATIO = 0.30


def ensure_assets():
    make_dark_bg(ASSETS / "bg_title.png", (6, 10, 22), (16, 32, 66))
    make_dark_bg(ASSETS / "bg_dark.png", (8, 12, 24), (15, 25, 48))
    make_dark_bg(ASSETS / "bg_close.png", (6, 10, 22), (10, 44, 60), glow=(20, 184, 166), glow2=(59, 130, 246))
    make_light_bg(ASSETS / "bg_light.png")
    make_arch_diagram(ASSETS / "architecture.png")

    framed = [
        ("b01_home.png", "framed_home.png", "nexora.markets / home", 105, None, True),
        ("b03_stock_aapl.png", "framed_stock.png", "nexora.markets / stocks / AAPL", 105, None, False),
        ("b08_forecast_1y.png", "framed_forecast.png", "nexora.markets / forecast / AAPL", 385, None, True),
        ("b07_ngx_liquidity.png", "framed_ngx.png", "nexora.markets / ngx / liquidity", 105, None, False),
        ("b01_home.png", "col_home.png", "nexora.markets / home", 105, 900, False),
        ("b07_ngx_liquidity.png", "col_ngx.png", "nexora.markets / ngx / liquidity", 105, 900, False),
        ("b13_dark.png", "col_forecast.png", "nexora.markets / forecast", 385, 900, False),
    ]
    for src, dst, url, top, ch, light in framed:
        make_framed_shot(FIG / src, ASSETS / dst, url, top, ch, light)

    thumbs = [
        ("b01_home.png", "th_home.png", 105),
        ("b05_ngx_board.png", "th_ngx.png", 105),
        ("b03_stock_aapl.png", "th_stock.png", 330),
        ("b07_ngx_liquidity.png", "th_liq.png", 105),
        ("b08_forecast_1y.png", "th_forecast.png", 560),
        ("b10_learn.png", "th_learn.png", 165),
    ]
    for src, dst, y0 in thumbs:
        make_thumb(FIG / src, ASSETS / dst, y0, THUMB_RATIO)


# ---------------------------------------------------------------- pptx helpers


def set_run(run, text, size, bold=True, color=None, font="Liberation Sans"):
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color if color is not None else T["body"]
    run.font.name = font


def fill(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def outline(shape, color, width_pt=1.5):
    shape.line.color.rgb = color
    shape.line.width = Pt(width_pt)


def shadow(shape, strength=None, blur_pt=14, dist_pt=5):
    col, alpha = T["shadow"]
    if strength is not None:
        alpha = strength
    sppr = shape._element.spPr
    old = sppr.find(qn("a:effectLst"))
    if old is not None:
        sppr.remove(old)
    sppr.append(parse_xml(
        f'<a:effectLst {nsdecls("a")}><a:outerShdw blurRad="{int(blur_pt * 12700)}" dist="{int(dist_pt * 12700)}" '
        f'dir="5400000" algn="t" rotWithShape="0"><a:srgbClr val="{col}"><a:alpha val="{alpha}"/></a:srgbClr>'
        f'</a:outerShdw></a:effectLst>'
    ))


def rect(slide, x, y, w, h, color, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.08):
    s = slide.shapes.add_shape(shape, x, y, w, h)
    fill(s, color)
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    return s


def hard_rect(slide, x, y, w, h, color):
    return rect(slide, x, y, w, h, color, MSO_SHAPE.RECTANGLE)


def card(slide, x, y, w, h, color=None, border=None, radius=0.08, border_w=1.4):
    s = rect(slide, x, y, w, h, color if color is not None else T["card"], radius=radius)
    outline(s, border if border is not None else T["line"], border_w)
    shadow(s)
    return s


def text(slide, content, x, y, w, h, size=18, bold=True, color=None, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = Pt(4)
    tf.margin_right = Pt(4)
    tf.margin_top = Pt(2)
    tf.margin_bottom = Pt(2)
    p = tf.paragraphs[0]
    p.alignment = align
    set_run(p.add_run(), content, size, bold, color)
    return box


def picture(slide, path, x, y, w, rotation=0.0, with_shadow=True):
    pic = slide.shapes.add_picture(str(path), x, y, width=w)
    if rotation:
        pic.rotation = rotation
    if with_shadow:
        shadow(pic, strength=40000 if T["name"] == "dark" else 26000, blur_pt=22, dist_pt=8)
    return pic


def img_ratio(path):
    with Image.open(path) as im:
        return im.height / im.width


def notes(slide, content):
    slide.notes_slide.notes_text_frame.text = content


def blank(prs, theme, bg):
    global T
    T = theme
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.shapes.add_picture(str(ASSETS / bg), 0, 0, W, H)
    return slide


def wordmark(slide, x, y, color=WHITE):
    logo = rect(slide, x, y, I(0.34), I(0.34), BLUE, radius=0.28)
    outline(logo, RGBColor(147, 197, 253), 1.2)
    text(slide, "N", x, y + I(0.02), I(0.34), I(0.3), 13, True, WHITE, PP_ALIGN.CENTER)
    text(slide, "NEXORA MARKETS", x + I(0.42), y + I(0.03), I(2.2), I(0.3), 13, True, color)


def header(slide, kicker, title, accent=BLUE):
    if T["name"] == "light":
        pill = rect(slide, I(0.55), I(0.24), I(2.9), I(0.4), accent, radius=0.5)
        outline(pill, WHITE, 1.2)
        text(slide, kicker.upper(), I(0.55), I(0.28), I(2.9), I(0.34), 13, True, WHITE, PP_ALIGN.CENTER)
        text(slide, title, I(0.55), I(0.72), I(12.2), I(0.56), 28, True, WHITE)
    else:
        pill = rect(slide, I(0.55), I(0.24), I(2.9), I(0.4), soft(accent), radius=0.5)
        outline(pill, accent, 1.8)
        text(slide, kicker.upper(), I(0.55), I(0.28), I(2.9), I(0.34), 13, True, WHITE, PP_ALIGN.CENTER)
        text(slide, title, I(0.55), I(0.72), I(12.2), I(0.56), 28, True, WHITE)
        hard_rect(slide, I(0.55), I(1.32), I(1.55), I(0.06), accent)
    wordmark(slide, I(10.25), I(0.27))


def footer(slide, n, total):
    hard_rect(slide, I(0.55), I(7.04), I(12.23), I(0.018), T["line"])
    text(slide, "NEXORA MARKETS  ·  Onwurah Ebube Michael (2022/CSC/018)  ·  Legacy University Okija",
         I(0.55), I(7.1), I(10.4), I(0.3), 12, True, T["foot"])
    text(slide, f"{n} / {total}", I(11.4), I(7.1), I(1.38), I(0.3), 12, True, T["title"], PP_ALIGN.RIGHT)


def badge(slide, x, y, d, label, accent, size=15):
    b = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, y, d, d)
    fill(b, accent)
    outline(b, WHITE if T["name"] == "light" else hl(accent), 1.6)
    tf = b.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    set_run(p.add_run(), label, size, True, WHITE)
    return b


def point_box(slide, x, y, w, h, line, accent=BLUE, fill_color=None, size=16, numbered=None):
    card(slide, x, y, w, h, fill_color)
    hard_rect(slide, x, y + I(0.12), I(0.09), h - I(0.24), accent)
    left, width = x + I(0.3), w - I(0.46)
    if numbered is not None:
        badge(slide, x + I(0.26), y + (h - I(0.46)) / 2, I(0.46), str(numbered), accent, 15)
        left, width = x + I(0.86), w - I(1.0)
    box = slide.shapes.add_textbox(left, y + I(0.08), width, h - I(0.16))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left, tf.margin_right, tf.margin_top, tf.margin_bottom = Pt(4), Pt(6), Pt(4), Pt(4)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    set_run(tf.paragraphs[0].add_run(), line, size, True, T["title"])


def point_stack(slide, items, x, y, w, box_h, gap=0.18, accent=BLUE, size=16, numbered=False, tint=False):
    for i, item in enumerate(items):
        bar = accent[i % len(accent)] if isinstance(accent, list) else accent
        fillc = T["card"] if i % 2 == 0 else T["alt"]
        if tint and i % 2 == 0:
            fillc = soft(bar)
        point_box(slide, x, y + I(i * (box_h + gap)), w, I(box_h), item, bar, fillc, size, (i + 1) if numbered else None)


def dual_point(slide, x, y, w, h, title, body, accent=BLUE, fill_color=None, title_size=18, body_size=15, num=None):
    card(slide, x, y, w, h, fill_color)
    hard_rect(slide, x, y + I(0.14), I(0.1), h - I(0.28), accent)
    left = x + I(0.32)
    if num is not None:
        badge(slide, x + I(0.3), y + I(0.22), I(0.5), num, accent, 15)
        left = x + I(0.95)
    box = slide.shapes.add_textbox(left, y + I(0.16), x + w - left - I(0.18), h - I(0.3))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left, tf.margin_right, tf.margin_top, tf.margin_bottom = Pt(4), Pt(6), Pt(4), Pt(4)
    p1 = tf.paragraphs[0]
    p1.space_after = Pt(8)
    set_run(p1.add_run(), title, title_size, True, hl(accent) if T["name"] == "light" else WHITE)
    p2 = tf.add_paragraph()
    set_run(p2.add_run(), body, body_size, True, T["body"])


def metric(slide, x, y, w, h, value, label, accent):
    card(slide, x, y, w, h, soft(accent), accent, border_w=1.8)
    hard_rect(slide, x + I(0.25), y, w - I(0.5), I(0.08), accent)
    box = slide.shapes.add_textbox(x + I(0.24), y + I(0.24), w - I(0.44), h - I(0.34))
    tf = box.text_frame
    tf.word_wrap = True
    p1 = tf.paragraphs[0]
    p1.space_after = Pt(6)
    set_run(p1.add_run(), value, 28, True, hl(accent))
    p2 = tf.add_paragraph()
    set_run(p2.add_run(), label, 14, True, T["title"])


def panel(slide, x, y, w, h, accent, title, subtitle=None):
    card(slide, x, y, w, h, soft(accent), accent, border_w=1.8)
    hard_rect(slide, x + I(0.3), y, w - I(0.6), I(0.08), accent)
    text(slide, title, x + I(0.3), y + I(0.2), w - I(0.6), I(0.42), 19, True, hl(accent))
    if subtitle:
        text(slide, subtitle, x + I(0.3), y + I(0.62), w - I(0.6), I(0.32), 14, True, T["muted"])


def add_fade(slide, start=1, stagger=90):
    targets = [s.shape_id for s in list(slide.shapes)[start:]]
    if not targets:
        return
    parts = []
    anim_id = 3
    for n, spid in enumerate(targets):
        delay = 120 + n * stagger
        parts.append(f'''
      <p:par>
        <p:cTn id="{anim_id}" fill="hold" presetID="10" presetClass="entr" presetSubtype="0" grpId="0" nodeType="withEffect">
          <p:stCondLst><p:cond delay="{delay}"/></p:stCondLst>
          <p:childTnLst>
            <p:set>
              <p:cBhvr>
                <p:cTn id="{anim_id+1}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>
                <p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>
                <p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
              </p:cBhvr>
              <p:to><p:strVal val="visible"/></p:to>
            </p:set>
            <p:animEffect transition="in" filter="fade">
              <p:cBhvr><p:cTn id="{anim_id+2}" dur="450"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr>
            </p:animEffect>
          </p:childTnLst>
        </p:cTn>
      </p:par>''')
        anim_id += 3
    timing = etree.fromstring(f'''
    <p:timing xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">
        <p:childTnLst><p:seq concurrent="1" nextAc="seek">
          <p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>
            <p:par><p:cTn id="1000" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst>
              <p:childTnLst>{''.join(parts)}</p:childTnLst>
            </p:cTn></p:par>
          </p:childTnLst></p:cTn>
        </p:seq></p:childTnLst>
      </p:cTn></p:par></p:tnLst>
    </p:timing>''')
    old = slide._element.find(qn("p:timing"))
    if old is not None:
        slide._element.remove(old)
    slide._element.find(qn("p:cSld")).addnext(timing)


def add_transition(slide):
    tree = etree.fromstring('''
    <p:transition xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" spd="med" advClick="1">
      <p:fade/>
    </p:transition>''')
    old = slide._element.find(qn("p:transition"))
    if old is not None:
        slide._element.remove(old)
    timing = slide._element.find(qn("p:timing"))
    (timing if timing is not None else slide._element.find(qn("p:cSld"))).addnext(tree)


def finish(slide, note, stagger=70):
    notes(slide, note)
    add_fade(slide, 1, stagger)
    add_transition(slide)


# ---------------------------------------------------------------- slides


def title_slide(prs):
    s = blank(prs, DARK, "bg_title.png")
    card(s, I(0.65), I(0.65), I(7.1), I(6.1), T["card"], BLUE, border_w=2.0)
    hard_rect(s, I(0.65), I(0.95), I(0.12), I(5.5), BLUE)

    brand = rect(s, I(1.05), I(0.98), I(3.9), I(0.56), BLUE, radius=0.5)
    outline(brand, RGBColor(147, 197, 253), 2.0)
    text(s, "NEXORA MARKETS", I(1.05), I(1.05), I(3.9), I(0.42), 19, True, WHITE, PP_ALIGN.CENTER)

    tf = s.shapes.add_textbox(I(1.05), I(1.82), I(6.35), I(4.65)).text_frame
    tf.word_wrap = True
    rows = [
        ("B.SC. COMPUTER SCIENCE DEFENCE  ·  LEGACY UNIVERSITY OKIJA", 11, RGBColor(147, 197, 253), 14),
        ("The Effect of a Market Visualizer on Nigerian Investors", 26, WHITE, 14),
        ("Design, Implementation, and Simulation-Based Evaluation", 14, RGBColor(94, 234, 212), 24),
        ("Onwurah Ebube Michael", 20, WHITE, 6),
        ("Matriculation No: 2022/CSC/018", 15, T["body"], 5),
        ("Supervisor: Dr Nwachukwu Nwosu", 15, T["body"], 5),
        ("October 2026", 13, T["muted"], 0),
    ]
    for i, (content, size, color, after) in enumerate(rows):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(after)
        set_run(p.add_run(), content, size, True, color)

    for i, (label, acc) in enumerate([("NGX IN NAIRA (₦)", RED), ("US STOCKS", BLUE), ("57 TESTS PASSED", TEAL)]):
        x = 1.05 + i * 2.12
        chip = rect(s, I(x), I(5.85), I(1.98), I(0.5), soft(acc), radius=0.5)
        outline(chip, acc, 1.6)
        text(s, label, I(x), I(5.94), I(1.98), I(0.34), 12, True, hl(acc), PP_ALIGN.CENTER)

    shots = [
        ("col_home.png", 8.2, 0.55, -4.0),
        ("col_ngx.png", 8.55, 2.5, 3.0),
        ("col_forecast.png", 8.15, 4.45, -2.0),
    ]
    width = 4.4
    for name, x, y, rot in shots:
        picture(s, ASSETS / name, I(x), I(y), I(width), rot)

    tags = [
        ("LIVE HOME", 8.0, 0.36, BLUE),
        ("NGX LIQUIDITY (₦)", 10.65, 2.3, RED),
        ("1–5 YEAR RANGE", 7.95, 4.27, TEAL),
    ]
    for label, x, y, acc in tags:
        t = rect(s, I(x), I(y), I(2.2), I(0.4), acc, radius=0.5)
        outline(t, WHITE, 1.4)
        shadow(t, 50000, 8, 3)
        text(s, label, I(x), I(y + 0.05), I(2.2), I(0.32), 12, True, WHITE, PP_ALIGN.CENTER)

    finish(s, "Introduce yourself, Nexora Markets, your title, and Dr Nwachukwu Nwosu. The three screens on the right are the real app: Home, the NGX liquidity board, and the Forecast range.", 80)


def overview_slide(prs, total):
    s = blank(prs, LIGHT, "bg_light.png")
    header(s, "Outline", "Presentation roadmap")
    steps = [
        ("01", "The Problem", "Why beginners misread share prices and get stuck in thin stocks", "Slide 3", BLUE),
        ("02", "The Goal", "One platform for NGX (in Naira) and US stocks side by side", "Slide 4", TEAL),
        ("03", "The System", "Six modules built in three layers with React and Node.js", "Slides 5–6", AMBER),
        ("04", "Live Proof", "Unusual-day alerts, 1–5 year price ranges and liquidity warnings", "Slides 7–11", RED),
        ("05", "Conclusion", "57 automated tests, honest limits and future work", "Slides 12–15", BLUE),
    ]
    cw, gap, top, ch = 2.25, 0.195, 2.05, 4.75
    hard_rect(s, I(0.9), I(top - 0.02), I(11.5), I(0.05), RGBColor(191, 207, 232))
    for i, (num, title, body, tag, acc) in enumerate(steps):
        x = 0.65 + i * (cw + gap)
        card(s, I(x), I(top), I(cw), I(ch))
        hard_rect(s, I(x + 0.3), I(top + ch - 0.08), I(cw - 0.6), I(0.08), acc)
        badge(s, I(x + cw / 2 - 0.38), I(top - 0.38), I(0.76), num, acc, 18)
        tf = s.shapes.add_textbox(I(x + 0.16), I(top + 0.55), I(cw - 0.32), I(ch - 1.35)).text_frame
        tf.word_wrap = True
        p1 = tf.paragraphs[0]
        p1.alignment = PP_ALIGN.CENTER
        p1.space_after = Pt(12)
        set_run(p1.add_run(), title, 19, True, hl(acc))
        p2 = tf.add_paragraph()
        p2.alignment = PP_ALIGN.CENTER
        p2.line_spacing = 1.1
        set_run(p2.add_run(), body, 17, True, T["body"])
        pill = rect(s, I(x + 0.3), I(top + ch - 0.72), I(cw - 0.6), I(0.4), soft(acc), radius=0.5)
        outline(pill, acc, 1.2)
        text(s, tag, I(x + 0.3), I(top + ch - 0.68), I(cw - 0.6), I(0.32), 13, True, hl(acc), PP_ALIGN.CENTER)
    footer(s, 2, total)
    finish(s, "Walk the panel through the five stages of the defence.", 50)


def problem_slide(prs, total):
    s = blank(prs, LIGHT, "bg_light.png")
    header(s, "Problem", "Six real traps facing Nigerian beginners", RED)
    rows = [
        ("Scattered sources", "NGX prices, US stocks, news and FX rates sit on different sites.", BLUE),
        ("Foreign-first tools", "Popular apps are built in dollars and ignore NGX realities.", TEAL),
        ("Unexplained charts", "Beginners see moving lines with no plain-English guidance.", AMBER),
        ("Share price vs size", "Thinking a ₦10 stock is cheaper than a ₦1,000 one, ignoring company size.", RED),
        ("The liquidity trap", "Buying a quiet NGX stock easily, then getting stuck when selling.", BLUE),
        ("Single-price hype", "Social media sells one target price instead of an honest range.", TEAL),
    ]
    for i, (title, body, acc) in enumerate(rows):
        col, row = i % 3, i // 3
        dual_point(s, I(0.65 + col * 4.12), I(1.75 + row * 2.6), I(3.78), I(2.2), title, body, acc,
                   title_size=18, body_size=15, num=str(i + 1))
    footer(s, 3, total)
    finish(s, "Emphasise #4 (share price vs company size) and #5 (liquidity trap — buying a stock you cannot easily sell).", 60)


def aim_slide(prs, total):
    s = blank(prs, LIGHT, "bg_light.png")
    header(s, "Aim & Objectives", "What Nexora Markets set out to achieve", TEAL)
    hero = rect(s, I(0.65), I(1.7), I(12.03), I(1.2), NAVY_DEEP, radius=0.14)
    outline(hero, BLUE, 1.6)
    shadow(hero)
    pill = rect(s, I(0.95), I(1.98), I(1.6), I(0.62), BLUE, radius=0.5)
    text(s, "MAIN AIM", I(0.95), I(2.08), I(1.6), I(0.44), 15, True, WHITE, PP_ALIGN.CENTER)
    text(s, "Build one web platform that helps Nigerian beginners read NGX (in Naira) and US stocks clearly — checked with price-range modelling and 57 automated tests.",
         I(2.8), I(1.84), I(9.65), I(0.95), 16, True, WHITE)
    objs = [
        ("Unify NGX & US stocks", "Nigerian shares in Naira beside US stocks and USD/NGN."),
        ("Flag unusual days", "3-Sigma rule plus Machine Learning on every chart."),
        ("Warn before you get stuck", "Tag stocks Easy, Slow or Hard to sell from volume."),
        ("Show an honest range", "Weaker, Typical and Stronger paths over 1–5 years."),
        ("Teach inside the app", "Explain company size (market cap) vs share price."),
        ("Private watchlists", "Secure sign-in so each user saves their own stocks."),
    ]
    for i, (title, body) in enumerate(objs):
        col, row = i % 3, i // 3
        dual_point(s, I(0.65 + col * 4.12), I(3.2 + row * 1.85), I(3.78), I(1.6), title, body,
                   BLUE if row == 0 else TEAL, title_size=16, body_size=14, num=str(i + 1))
    footer(s, 4, total)
    finish(s, "Stress that the goal is decision support and education — not a brokerage app that takes people's money.", 55)


def system_slide(prs, total):
    s = blank(prs, DARK, "bg_dark.png")
    header(s, "System", "Six modules inside Nexora Markets")
    mods = [
        ("Home", "Live USD/NGN rate, market overview and a guided tour.", BLUE, "th_home.png"),
        ("NGX (Nigeria)", "Nigerian shares in Naira, All-Share Index, company pages.", RED, "th_ngx.png"),
        ("US Stocks", "Charts with unusual-day alerts and side-by-side compare.", TEAL, "th_stock.png"),
        ("Liquidity Board", "Ranks listings Easy, Slow or Hard to sell.", AMBER, "th_liq.png"),
        ("Forecast", "1, 2, 3 and 5-year Weaker / Typical / Stronger range.", BLUE, "th_forecast.png"),
        ("Learn & Watchlist", "Plain lessons on company size, plus saved stocks.", TEAL, "th_learn.png"),
    ]
    cw, chh = 3.78, 2.52
    for i, (name, body, acc, thumb) in enumerate(mods):
        col, row = i % 3, i // 3
        x, y = 0.65 + col * 4.12, 1.62 + row * 2.7
        card(s, I(x), I(y), I(cw), I(chh), T["card"], T["line"])
        tw = cw - 0.36
        s.shapes.add_picture(str(ASSETS / thumb), I(x + 0.18), I(y + 0.18), width=I(tw))
        th = tw * img_ratio(ASSETS / thumb)
        badge(s, I(x + cw - 0.66), I(y + 0.1), I(0.5), str(i + 1), acc, 14)
        tf = s.shapes.add_textbox(I(x + 0.18), I(y + 0.26 + th), I(tw), I(chh - th - 0.32)).text_frame
        tf.word_wrap = True
        tf.margin_top = Pt(2)
        p1 = tf.paragraphs[0]
        p1.space_after = Pt(4)
        set_run(p1.add_run(), name, 17, True, hl(acc))
        p2 = tf.add_paragraph()
        set_run(p2.add_run(), body, 14, True, T["body"])
    footer(s, 5, total)
    finish(s, "Briefly name the six modules — each card shows the real screen — before the architecture and live demos.", 55)


def architecture_slide(prs, total):
    s = blank(prs, DARK, "bg_dark.png")
    header(s, "Architecture", "How Nexora Markets is built (3-tier design)", TEAL)
    pic = picture(s, ASSETS / "architecture.png", I(0.55), I(1.7), I(7.45))
    pic.line.color.rgb = T["line"]
    pic.line.width = Pt(1.5)
    point_stack(s, [
        "Server does all maths; browser only draws",
        "Live data: NGX Pulse, Yahoo Finance & FX",
        "Refuses to invent missing prices or history",
        "Each user only sees their own watchlist",
        "API keys stay hidden on the server",
    ], I(8.28), I(1.7), I(4.5), box_h=0.86, gap=0.18, accent=[BLUE, TEAL, AMBER, RED, BLUE], size=16, numbered=True)
    footer(s, 6, total)
    finish(s, "Explain simply: React in the browser, Node/Express on the server doing the calculations, and Supabase for private watchlists.")


def shot_slide(prs, total, n, theme, kicker, title, framed, points, note, accent=BLUE):
    s = blank(prs, theme, "bg_light.png" if theme is LIGHT else "bg_dark.png")
    header(s, kicker, title, accent)
    path = ASSETS / framed
    top = 1.7
    w = 7.45
    h = w * img_ratio(path)
    area = 6.85 - top
    if h > area:
        w = area / img_ratio(path)
        h = area
    picture(s, path, I(0.55 + (7.45 - w) / 2), I(top + max(0.0, (area - h) / 2)), I(w))
    point_stack(s, points, I(8.28), I(top), I(4.5), box_h=1.06, gap=0.22, accent=accent, size=16, numbered=True, tint=True)
    footer(s, n, total)
    finish(s, note)


def detectors_slide(prs, total):
    s = blank(prs, LIGHT, "bg_light.png")
    header(s, "Methods", "How the system spots an unusual trading day", AMBER)
    sides = [
        (0.55, AMBER, "1. 3-Sigma Rule (Gold Ring)", "Traditional statistical check", [
            "Flags if today's move is 3× larger than normal",
            "Also flags sudden spikes in trading volume",
            "Simple formula any examiner can check by hand",
            "Warning to read the news — NOT a buy/sell tip",
        ]),
        (6.86, RED, "2. Isolation Forest (Wine Dot)", "Machine-learning anomaly detector", [
            "Checks price move, volume & high-low spread",
            "Spots unusual combinations a single rule misses",
            "Flags only the most abnormal 5% of trading days",
            "When Gold and Wine agree, that day stands out",
        ]),
    ]
    for x, acc, title, sub, items in sides:
        panel(s, I(x), I(1.7), I(5.92), I(5.1), acc, title, sub)
        point_stack(s, items, I(x + 0.3), I(2.72), I(5.32), box_h=0.82, gap=0.16, accent=acc, size=16)
    footer(s, 9, total)
    finish(s, "Explain why there are two methods: Gold is the textbook statistics rule; Wine is Machine Learning checking several features at once.")


def metrics_slide(prs, total):
    s = blank(prs, DARK, "bg_dark.png")
    header(s, "Evaluation", "How Nexora Markets was tested and proven")
    cards = [
        ("57 Tests", "Automated backend checks", BLUE),
        ("2,511 Days", "10-year Apple history", TEAL),
        ("2 Detectors", "3-Sigma & Isolation Forest", AMBER),
        ("1–5 Years", "Simulated price horizons", RED),
    ]
    for i, (val, lbl, acc) in enumerate(cards):
        metric(s, I(0.65 + i * 3.08), I(1.68), I(2.78), I(1.5), val, lbl, acc)
    point_stack(s, [
        "1-Yr AAPL: $294 (Weaker) · $427 (Typical) · $621 (Stronger)",
        "3-Yr range widens ($367 – $1,337) as uncertainty grows",
        "Short NGX history is rejected honestly — never faked",
    ], I(0.65), I(3.55), I(5.82), box_h=0.9, gap=0.22, accent=BLUE, size=15, tint=True)
    point_stack(s, [
        "Simulation = mathematical range from past daily moves",
        "57 unit tests verify every formula before deployment",
        "No human survey claimed — proven via code & live screens",
    ], I(6.86), I(3.55), I(5.82), box_h=0.9, gap=0.22, accent=TEAL, size=15, tint=True)
    footer(s, 12, total)
    finish(s, "This answers 'Simulation-Based Evaluation': a mathematical price-range model + 57 automated tests + live screens.", 60)


def limits_slide(prs, total):
    s = blank(prs, LIGHT, "bg_light.png")
    header(s, "Limitations", "Honest boundaries of this study", AMBER)
    items = [
        ("No human investor survey", "Time was limited to one academic session, so evaluation focused on software and mathematical testing.", AMBER),
        ("Free NGX data has short history", "Free NGX feeds return recent sessions only; the app says 'not enough history' instead of guessing.", BLUE),
        ("Past moves do not guarantee the future", "The Forecast range replays past daily volatility — it cannot know future news or management changes.", TEAL),
        ("Educational tool, not a broker", "Nexora Markets does not hold money, execute trades or give personal financial advice.", RED),
    ]
    for i, (title, body, acc) in enumerate(items):
        dual_point(s, I(0.55), I(1.68 + i * 1.3), I(12.23), I(1.1), title, body, acc,
                   title_size=18, body_size=15, num=str(i + 1))
    footer(s, 13, total)
    finish(s, "Examiners respect honesty: state clearly what the system does not claim to do.", 55)


def conclusion_slide(prs, total):
    s = blank(prs, DARK, "bg_dark.png")
    header(s, "Close", "Conclusion and future recommendations", TEAL)
    sides = [
        (0.55, BLUE, "What Nexora Markets Achieved", [
            "Combined NGX (in Naira) & US stocks in one tool",
            "Built Statistical + ML unusual-day alerts",
            "Created plain-English Liquidity Trap warnings",
            "Replaced single-price hype with a 1–5yr range",
        ]),
        (6.86, TEAL, "Recommendations for Future Work", [
            "Test with a group of Nigerian beginner investors",
            "Connect paid multi-year NGX historical feeds",
            "Add Nigerian languages (Igbo, Yoruba, Hausa)",
            "Keep refusing to invent missing market data",
        ]),
    ]
    for x, acc, title, items in sides:
        panel(s, I(x), I(1.7), I(5.92), I(5.1), acc, title)
        point_stack(s, items, I(x + 0.3), I(2.45), I(5.32), box_h=0.9, gap=0.18, accent=acc, size=16, numbered=True)
    footer(s, 14, total)
    finish(s, "Summarise your 4 concrete contributions and 4 practical next steps.")


def thank_slide(prs, total):
    s = blank(prs, DARK, "bg_close.png")
    card(s, I(1.6), I(0.6), I(10.1), I(3.45), T["card"], TEAL, border_w=2.0)
    hard_rect(s, I(1.95), I(0.6), I(9.4), I(0.1), TEAL)
    text(s, "NEXORA MARKETS", I(1.8), I(0.9), I(9.7), I(0.45), 18, True, hl(TEAL), PP_ALIGN.CENTER)
    text(s, "Thank You", I(1.8), I(1.35), I(9.7), I(0.95), 50, True, WHITE, PP_ALIGN.CENTER)
    text(s, "Questions from the panel are welcome.", I(1.8), I(2.38), I(9.7), I(0.48), 22, True, hl(BLUE), PP_ALIGN.CENTER)
    hard_rect(s, I(5.7), I(3.0), I(1.9), I(0.06), BLUE)
    text(s, "Onwurah Ebube Michael  ·  2022/CSC/018  ·  Supervisor: Dr Nwachukwu Nwosu",
         I(1.8), I(3.22), I(9.7), I(0.48), 16, True, WHITE, PP_ALIGN.CENTER)
    width = 3.6
    for i, (name, rot) in enumerate([("col_home.png", -3.0), ("col_ngx.png", 0.0), ("col_forecast.png", 3.0)]):
        picture(s, ASSETS / name, I(0.85 + i * (width + 0.42)), I(4.55), I(width), rot)
    finish(s, "Thank the panel and wait for questions.", 90)


def build():
    ensure_assets()
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    prs.core_properties.title = "Nexora Markets — The Effect of a Market Visualizer on Nigerian Investors"
    prs.core_properties.author = "Onwurah Ebube Michael"
    total = 15

    title_slide(prs)
    overview_slide(prs, total)
    problem_slide(prs, total)
    aim_slide(prs, total)
    system_slide(prs, total)
    architecture_slide(prs, total)

    shot_slide(prs, total, 7, LIGHT, "Live Demo 1", "Nexora Markets: NGX, US stocks & Naira rate", "framed_home.png", [
        "NGX & US stocks + Learn in one top menu",
        "Live Dollar-to-Naira (₦) rate always visible",
        "Guided tour walks a beginner through the page",
        "Purely educational — no 'Buy' button traps",
    ], "Point to the top menu and the live USD/NGN bar.", BLUE)

    shot_slide(prs, total, 8, DARK, "Live Demo 2", "Spotting unusual days on a real chart", "framed_stock.png", [
        "Gold ring = 3-Sigma statistical spike",
        "Wine dot = Isolation Forest ML detection",
        "Clicking any marker explains why it was flagged",
        "Alerts the user to investigate — not a trade tip",
    ], "Point to the gold rings and wine dots on the Apple chart.", AMBER)

    detectors_slide(prs, total)

    shot_slide(prs, total, 10, LIGHT, "Live Demo 3", "1–5 Year price range: Weaker, Typical & Stronger", "framed_forecast.png", [
        "Built from 2,511 real daily closes (10 years)",
        "Weaker ($294) · Typical ($427) · Stronger ($621)",
        "Range widens over 3–5 years as uncertainty grows",
        "Clear warning: replays past moves, not a promise",
    ], "Read the three cards clearly: Weaker, Typical, Stronger.", TEAL)

    shot_slide(prs, total, 11, DARK, "Live Demo 4", "NGX Liquidity Board — avoiding the exit trap", "framed_ngx.png", [
        "Tests if a normal ₦500,000 sale can exit easily",
        "Red = Hard to sell · Amber = Slow · Green = Easy",
        "Explains every rating in plain everyday English",
        "Missing exchange facts say 'Not stated' — never ₦0",
    ], "Explain the ₦500,000 normal sale test and why Red means you can get stuck.", RED)

    metrics_slide(prs, total)
    limits_slide(prs, total)
    conclusion_slide(prs, total)
    thank_slide(prs, total)

    prs.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()
