#!/usr/bin/env python3
"""Build the defence presentation from the report figures."""
from pathlib import Path
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Emu, Inches, Pt

ROOT = Path("/home/m/Desktop/m&s/docs")
FIG = ROOT / "report" / "figures"
OUT = ROOT / "PRESENTATION.pptx"

NAVY = RGBColor(0x0B, 0x1F, 0x4B)
BLUE = RGBColor(0x1D, 0x4E, 0xD8)
INK = RGBColor(0x1E, 0x29, 0x3B)
MUTED = RGBColor(0x47, 0x55, 0x69)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
PALE = RGBColor(0xF4, 0xF7, 0xFB)
LINE = RGBColor(0xD6, 0xDE, 0xEA)
GOLD = RGBColor(0xB4, 0x53, 0x09)

W, H = Inches(13.333), Inches(7.5)


def set_run(run, text, size, bold, color, font="Calibri"):
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color


def add_text(slide, text, x, y, w, h, size=18, bold=False, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, font="Calibri"):
    box = slide.shapes.add_textbox(x, y, w, h)
    frame = box.text_frame
    frame.word_wrap = True
    frame.auto_size = None
    frame.margin_left = Emu(0)
    frame.margin_right = Emu(0)
    frame.margin_top = Emu(0)
    frame.margin_bottom = Emu(0)
    try:
        frame._txBody.bodyPr.set("anchor", {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[anchor])
    except Exception:
        pass
    p = frame.paragraphs[0]
    p.alignment = align
    p.space_after = Pt(0)
    set_run(p.add_run(), text, size, bold, color, font)
    return box


def add_bullets(slide, items, x, y, w, h, size=20, color=INK, spacing=10):
    box = slide.shapes.add_textbox(x, y, w, h)
    frame = box.text_frame
    frame.word_wrap = True
    frame.margin_left = Emu(0)
    frame.margin_right = Emu(0)
    for i, item in enumerate(items):
        p = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.level = 0
        p.space_after = Pt(spacing)
        set_run(p.add_run(), item, size, False, color)
    return box


def rect(slide, x, y, w, h, fill):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.fill.background()
    shape.shadow.inherit = False
    return shape


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def chrome(slide, title, number, total):
    rect(slide, 0, 0, W, Inches(0.08), BLUE)
    add_text(slide, title, Inches(0.55), Inches(0.28), Inches(11.5), Inches(0.55), 28, True, NAVY)
    rect(slide, Inches(0.55), Inches(0.95), Inches(1.4), Inches(0.06), BLUE)
    add_text(slide, f"{number}  /  {total}", Inches(11.4), Inches(7.05), Inches(1.4), Inches(0.3), 12, False, MUTED, PP_ALIGN.RIGHT)
    add_text(slide, "Nexora Markets  ·  Onwurah Ebube Michael", Inches(0.55), Inches(7.05), Inches(8), Inches(0.3), 12, False, MUTED)


def new_slide(prs, title, number, total, speak):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    rect(slide, 0, 0, W, H, WHITE)
    chrome(slide, title, number, total)
    notes(slide, speak)
    return slide


def picture(slide, name, x, y, w):
    slide.shapes.add_picture(str(FIG / name), x, y, width=w)


def build():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    prs.core_properties.title = "Nexora Markets — project presentation"
    prs.core_properties.author = "Onwurah Ebube Michael"
    total = 16

    # 1 Title
    s = prs.slides.add_slide(prs.slide_layouts[6])
    rect(s, 0, 0, W, H, NAVY)
    rect(s, 0, 0, Inches(0.18), H, BLUE)
    add_text(s, "DEPARTMENT OF COMPUTER SCIENCE", Inches(0.7), Inches(0.45), Inches(11), Inches(0.35), 14, True, RGBColor(0x93, 0xC5, 0xFD))
    add_text(s, "LEGACY UNIVERSITY OKIJA", Inches(0.7), Inches(0.78), Inches(11), Inches(0.3), 14, False, RGBColor(0xCB, 0xD5, 0xE1))
    add_text(s, "The Effect of a Market Visualizer\non Nigerian Investors", Inches(0.7), Inches(1.7), Inches(11.5), Inches(1.7), 40, True, WHITE)
    add_text(s, "Design, Implementation, and Simulation-Based Evaluation", Inches(0.7), Inches(3.55), Inches(11), Inches(0.45), 20, False, RGBColor(0xBF, 0xDB, 0xFE))
    add_text(s, "ONWURAH EBUBE MICHAEL\n2022/CSC/018", Inches(0.7), Inches(4.5), Inches(7), Inches(0.8), 20, True, WHITE)
    add_text(s, "Supervisor: Dr Nwachukwu Nwosu\nOctober 2026", Inches(0.7), Inches(5.5), Inches(8), Inches(0.7), 16, False, RGBColor(0xE2, 0xE8, 0xF0))
    notes(s, "Good day. My name is Onwurah Ebube Michael. My supervisor is Dr Nwachukwu Nwosu. This project is a market visualizer for beginners, with the Nigerian Exchange in naira as the local focus.")

    s = new_slide(prs, "What I will cover", 2, total, "I will move from the problem, to what I built, to the two ideas an examiner may ask about: unusual days, and the possible price range. Then I will show the screens.")
    add_bullets(s, [
        "1    The problem a beginner faces",
        "2    Aim, and what the literature left open",
        "3    How the system is built",
        "4    Unusual days, liquidity, and the possible range",
        "5    What was tested, and what the work does not claim",
    ], Inches(0.7), Inches(1.4), Inches(11), Inches(4.8), 26, INK, 16)

    s = new_slide(prs, "Background", 3, total, "Access is no longer the hard part. A Nigerian can open a brokerage account on a phone. The hard part is reading what the screen means.")
    add_bullets(s, [
        "The Nigerian Exchange is where listed Nigerian companies trade.",
        "A beginner sees a price, a percentage, and a moving line.",
        "A ₦10 share is not a smaller company than a ₦1,000 share. Size is market capitalisation: price times the number of shares.",
        "A cheap-looking share can be a liquidity trap: you can buy it, then struggle to sell it.",
        "Most rich charting tools are built for foreign markets and dollars.",
    ], Inches(0.7), Inches(1.35), Inches(12), Inches(5.2), 22, INK, 14)

    s = new_slide(prs, "Problem statement", 4, total, "State the six problems briefly. Do not read every word. Stress price versus size, and the liquidity trap.")
    add_bullets(s, [
        "Information is scattered across the exchange, brokers, news, and the dollar rate.",
        "Popular tools are foreign-first. NGX coverage and naira context are thin.",
        "Charts are shown with little plain explanation.",
        "Beginners compare the share price instead of market capitalisation.",
        "A thin listing can trap the buyer. Most tools never warn about this.",
        "The future is shown as one confident number, or not shown at all.",
    ], Inches(0.7), Inches(1.3), Inches(12), Inches(5.3), 22, INK, 12)

    s = new_slide(prs, "Aim and objectives", 5, total, "Read the aim once. Then say the objectives in groups: show the markets, explain the chart, warn about thin shares, and draw a range that is not a promise.")
    add_text(s, "Aim", Inches(0.7), Inches(1.25), Inches(2), Inches(0.35), 16, True, BLUE)
    add_text(s, "Design and implement a web visualizer that helps a Nigerian-oriented beginner read NGX, United States, and crypto data, and evaluate it with a price-range model, tests, and the working screens.", Inches(0.7), Inches(1.65), Inches(12), Inches(1.15), 20, False, INK)
    add_text(s, "Objectives", Inches(0.7), Inches(2.95), Inches(3), Inches(0.35), 16, True, BLUE)
    add_bullets(s, [
        "Show NGX prices in naira beside United States shares and crypto.",
        "Explain charts, and mark unusual days with a three-sigma rule and Isolation Forest.",
        "Warn when a listing may be hard to sell, and teach size versus share price.",
        "Draw a weaker, typical, and stronger range from that asset’s own history.",
        "Keep a private watchlist, and state the limits honestly.",
    ], Inches(0.7), Inches(3.4), Inches(12), Inches(3.2), 20, INK, 8)

    s = new_slide(prs, "What the literature left open", 6, total, "Do not summarise every author. Name the idea, then the gap: nobody put these ideas into one beginner tool for Nigerian users.")
    add_bullets(s, [
        "Clear charts help people compare values (Few; Munzner). People adopt tools they find useful and easy (Davis).",
        "Heavy trading by individuals has been linked to worse results (Barber and Odean).",
        "Isolation Forest finds odd points quickly (Liu, Ting, and Zhou). A three-sigma rule is the simple check beside it.",
        "Illiquid shares are hard to sell (Amihud). Future prices are often modelled as a widening range (Hull).",
        "Gap: these ideas were not combined for a Nigerian beginner, in naira, with plain warnings.",
    ], Inches(0.7), Inches(1.35), Inches(12), Inches(5.2), 21, INK, 12)

    s = new_slide(prs, "How the system is built", 7, total, "Point at the three tiers. Say the maths runs on the server, on the prices that actually arrived. The browser only draws them.")
    slide_pic = s.shapes.add_picture(str(FIG / "fig4_1.png"), Inches(0.4), Inches(1.25), height=Inches(5.45))
    add_bullets(s, [
        "Browser: React. It draws charts and lessons.",
        "Server: Node.js and Express. It fetches, cleans, and does the maths.",
        "Sources: NGX Pulse, Yahoo Finance, CoinGecko, and a dollar-rate feed.",
        "Supabase keeps the account and that user’s watchlist only.",
        "Missing prices are left blank. They are not invented.",
    ], Inches(7.15), Inches(1.45), Inches(5.7), Inches(5), 18, INK, 12)
    notes(s, "React in the browser. Node.js and Express on the server. NGX Pulse, Yahoo Finance, CoinGecko, and a dollar-rate service. Supabase holds the account and the watchlist only. The maths runs on the series that actually arrived.")

    s = new_slide(prs, "What the user sees", 8, total, "Home, then the six menu items. Mention the dollar-to-naira rate in the bar.")
    picture(s, "b01_home.png", Inches(0.45), Inches(1.2), Inches(7.6))
    add_bullets(s, [
        "Home, Stocks, Crypto, NGX, Forecast, Learn.",
        "NGX prices stay in naira.",
        "A watchlist is saved after log-in.",
        "No orders are placed here.",
    ], Inches(8.3), Inches(1.7), Inches(4.6), Inches(4.5), 18, INK, 12)

    s = new_slide(prs, "NGX and the liquidity trap", 9, total, "A liquidity trap here is not the interest-rate term from economics. It means a thin share you cannot easily sell. Red means a normal ₦500,000 sale is a large part of the day’s trade.")
    picture(s, "b07_ngx_liquidity.png", Inches(0.4), Inches(1.2), Inches(8.1))
    add_bullets(s, [
        "Easy, slow, or hard to sell.",
        "Normal NGX sale: ₦500,000.",
        "Red: at least one-tenth of the day’s trade.",
        "Missing facts stay “Not stated”, not zero.",
    ], Inches(8.7), Inches(1.6), Inches(4.2), Inches(4.6), 18, INK, 12)

    s = new_slide(prs, "Unusual days, two ways", 10, total, "Gold ring is three-sigma. Wine dot is Isolation Forest. Neither is a buy or sell signal. The simple rule is there so the model can be compared with something an examiner can check.")
    picture(s, "b03_stock_aapl.png", Inches(0.35), Inches(1.15), Inches(8.3))
    add_bullets(s, [
        "Gold ring: the move is more than three standard deviations from this chart’s own average.",
        "Wine dot: Isolation Forest, using return, size of move, volume, and the day’s range.",
        "Top 5% of scores, and a score of at least 0.55.",
        "Detection only. Not a forecast.",
    ], Inches(8.8), Inches(1.45), Inches(4.2), Inches(5), 16, INK, 10)

    s = new_slide(prs, "Simulation-based evaluation", 11, total, "This is what the title means. The range replays the past daily moves. Read Apple’s one-year numbers, then say the band widens over three years. Read the warning: it can be wrong.")
    picture(s, "b08_forecast_1y.png", Inches(0.35), Inches(1.15), Inches(8.2))
    add_text(s, "Apple, 1 year", Inches(8.75), Inches(1.25), Inches(4.2), Inches(0.35), 16, True, BLUE)
    add_bullets(s, [
        "Weaker  $294   −12%",
        "Typical  $427   +28%",
        "Stronger  $621   +86%",
        "From 2,511 daily closes, 2016 to 2026.",
        "A model of the past mix of moves. Not a promise.",
    ], Inches(8.75), Inches(1.7), Inches(4.2), Inches(4.6), 16, INK, 8)

    s = new_slide(prs, "Learn, beside the data", 12, total, "The lessons sit in the same website. Open the earnings lesson or the one that says compare size, not the share price.")
    picture(s, "b10b_learn_lesson.png", Inches(0.45), Inches(1.2), Inches(7.8))
    add_bullets(s, [
        "How to read a price and a chart.",
        "How to read an earnings report.",
        "Compare size, not the share price.",
        "Unusual days, liquidity, and the range.",
        "Short sentences, with a picture.",
    ], Inches(8.5), Inches(1.6), Inches(4.4), Inches(4.6), 18, INK, 12)

    s = new_slide(prs, "Testing and security", 13, total, "57 automated tests. I also opened every main screen. Say passwords never pass through my server, and each user can see only their own watchlist.")
    cards = [
        ("57", "Backend tests passed"),
        ("8", "Test files, including the range and liquidity"),
        ("1", "Watchlist row per user"),
        ("0", "Secret keys in the browser"),
    ]
    for i, (num, label) in enumerate(cards):
        x = Inches(0.55 + (i % 4) * 3.15)
        y = Inches(1.45)
        rect(s, x, y, Inches(2.95), Inches(2.15), PALE)
        add_text(s, num, x + Inches(0.15), y + Inches(0.25), Inches(2.6), Inches(0.8), 36, True, BLUE)
        add_text(s, label, x + Inches(0.15), y + Inches(1.15), Inches(2.6), Inches(0.75), 14, False, INK)
    add_bullets(s, [
        "Indicators, unusual days, liquidity, NGX facts, and the price range are tested.",
        "Row-level security: a signed-in user can read and change only their own watchlist.",
        "Live screens were checked: Home, Stocks, Crypto, NGX, Forecast, Learn, log-in, and a phone width.",
    ], Inches(0.7), Inches(4.0), Inches(12), Inches(2.5), 20, INK, 10)

    s = new_slide(prs, "Limitations", 14, total, "Say these before anyone asks. Limited time is why there is no study with real users. Free NGX history is short, so the system says so instead of guessing.")
    add_bullets(s, [
        "No human-subject study. There was limited time, so the effect on real investors was not measured.",
        "One student, one academic session.",
        "The free NGX plan returns about the last seven sessions. A long NGX range needs more history, and the page says so.",
        "Some NGX facts, such as free float, stay “Not stated” when the source does not give them.",
        "The range assumes the past mix of daily moves continues. It can be wrong.",
    ], Inches(0.7), Inches(1.4), Inches(12), Inches(5), 22, INK, 12)

    s = new_slide(prs, "Conclusion", 15, total, "Close on what was built, not on a claim about all Nigerian investors. Then stop and invite questions.")
    add_bullets(s, [
        "One website now shows NGX in naira, United States shares, and crypto, with plain explanations.",
        "Unusual days are shown two ways, so a simple rule sits beside a machine-learning model.",
        "Liquidity warnings and the Learn page address the price-versus-size mistake and the liquidity trap.",
        "The possible range is a simulation of past daily moves: weaker, typical, and stronger. It is not a promise.",
        "The contribution is a tested, locally aware teaching tool, and an honest way to show missing data.",
    ], Inches(0.7), Inches(1.4), Inches(12), Inches(5), 22, INK, 12)

    s = prs.slides.add_slide(prs.slide_layouts[6])
    rect(s, 0, 0, W, H, NAVY)
    rect(s, 0, 0, Inches(0.18), H, BLUE)
    add_text(s, "Thank you", Inches(0.7), Inches(2.2), Inches(11), Inches(0.9), 48, True, WHITE)
    add_text(s, "I welcome your questions.", Inches(0.7), Inches(3.2), Inches(11), Inches(0.5), 24, False, RGBColor(0xBF, 0xDB, 0xFE))
    add_text(s, "Onwurah Ebube Michael   ·   2022/CSC/018\nSupervisor: Dr Nwachukwu Nwosu", Inches(0.7), Inches(4.3), Inches(10), Inches(0.8), 18, False, RGBColor(0xE2, 0xE8, 0xF0))
    notes(s, "Stop. Let them ask. If you do not know, say you did not test that, rather than guessing.")

    prs.save(OUT)
    print(OUT, "slides", len(prs.slides))


if __name__ == "__main__":
    build()
