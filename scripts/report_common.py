#!/usr/bin/env python3
"""Modul bersama untuk laporan audit Rumbela: font, palet, gaya, helper."""
import os, sys, hashlib

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                Table, TableStyle, Image, KeepTogether, CondPageBreak,
                                HRFlowable)
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage

PDF_SKILL_DIR = '/home/z/my-project/skills/pdf'
sys.path.insert(0, os.path.join(PDF_SKILL_DIR, 'scripts'))

ASSET = '/home/z/my-project/audit/assets'
FONT_DIR = '/usr/share/fonts'

# ============ FONT ============
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Noto Sans SC', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Noto Sans SC Bold', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('Noto Sans SC', normal='Noto Sans SC', bold='Noto Sans SC Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

from pdf import install_font_fallback  # noqa: E402
install_font_fallback()

# ============ PALET (Template 07 Crystal Blue - body subset, fixed) ============
PAGE_BG      = colors.HexColor('#f5f8fc')
SECTION_BG   = colors.HexColor('#edf2f9')
CARD_BG      = colors.HexColor('#e4ecf5')
TABLE_STRIPE = colors.HexColor('#eef3fa')
HEADER_FILL  = colors.HexColor('#1a4a7a')
BORDER       = colors.HexColor('#c0d0e2')
ACCENT       = colors.HexColor('#2d7ab3')
ACCENT_2     = colors.HexColor('#4da8da')
TEXT_PRIMARY = colors.HexColor('#142840')
TEXT_MUTED   = colors.HexColor('#5a7a96')
WARN         = colors.HexColor('#8a5a3a')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ============ GEOMETRI ============
PAGE_W, PAGE_H = A4
MARGIN = 0.78 * inch          # kiri = kanan (simetris)
TOP_M, BOT_M = 0.86 * inch, 0.78 * inch
CONTENT_W = PAGE_W - 2 * MARGIN
AVAIL_H = PAGE_H - TOP_M - BOT_M
H1_ORPHAN = AVAIL_H * 0.25
TOC_PAGES = 1

DOC_TITLE = 'Laporan Audit Web App Rumbela Live'

# ============ GAYA ============
S = {}
S['body'] = ParagraphStyle('body', fontName='FreeSerif', fontSize=10.5, leading=16.5,
                           alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
                           spaceBefore=0, spaceAfter=8)
S['lead'] = ParagraphStyle('lead', parent=S['body'], fontSize=11, leading=17.5,
                           textColor=TEXT_PRIMARY)
S['h1'] = ParagraphStyle('h1', fontName='FreeSerif-Bold', fontSize=20, leading=25,
                         textColor=TEXT_PRIMARY, spaceBefore=6, spaceAfter=0)
S['h1kick'] = ParagraphStyle('h1kick', fontName='FreeSerif', fontSize=9, leading=12,
                             textColor=ACCENT, spaceBefore=0, spaceAfter=3)
S['h2'] = ParagraphStyle('h2', fontName='FreeSerif-Bold', fontSize=14, leading=18.5,
                         textColor=HEADER_FILL, spaceBefore=14, spaceAfter=6)
S['h3'] = ParagraphStyle('h3', fontName='FreeSerif-Bold', fontSize=11.5, leading=15,
                         textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=4)
S['bullet'] = ParagraphStyle('bullet', parent=S['body'], leftIndent=16, bulletIndent=5,
                             spaceAfter=4, alignment=TA_LEFT)
S['caption'] = ParagraphStyle('caption', fontName='FreeSerif-Italic', fontSize=8.5,
                              leading=11.5, textColor=TEXT_MUTED, alignment=TA_CENTER,
                              spaceBefore=3, spaceAfter=6)
S['quote'] = ParagraphStyle('quote', fontName='FreeSerif-Italic', fontSize=10.5,
                            leading=16, textColor=TEXT_MUTED, leftIndent=10,
                            alignment=TA_LEFT)
S['th'] = ParagraphStyle('th', fontName='FreeSerif-Bold', fontSize=9.3, leading=12,
                         textColor=colors.white, alignment=TA_CENTER)
S['td'] = ParagraphStyle('td', fontName='FreeSerif', fontSize=9.3, leading=12.5,
                         textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK')
S['tdc'] = ParagraphStyle('tdc', parent=S['td'], alignment=TA_CENTER)
S['stat_v'] = ParagraphStyle('stat_v', fontName='FreeSerif-Bold', fontSize=19, leading=23,
                             textColor=ACCENT, alignment=TA_CENTER)
S['stat_l'] = ParagraphStyle('stat_l', fontName='FreeSerif', fontSize=8.3, leading=11,
                             textColor=TEXT_MUTED, alignment=TA_CENTER)
S['toc_t'] = ParagraphStyle('toc_t', fontName='FreeSerif-Bold', fontSize=20, leading=25,
                            textColor=TEXT_PRIMARY, spaceAfter=14)
S['toc0'] = ParagraphStyle('toc0', fontName='FreeSerif', fontSize=11.5, leading=21,
                           textColor=TEXT_PRIMARY, leftIndent=6)

# ============ HELPER ============
def P(text, style='body'):
    return Paragraph(text, S[style])

def bullets(items):
    return [Paragraph(f'•  {t}', S['bullet']) for t in items]

def heading(story, num, title, key_extra=''):
    """H1 dengan nomor bab, garis aksen, dan bookmark TOC."""
    key = 'h_' + hashlib.md5(f'{num}-{title}-{key_extra}'.encode()).hexdigest()[:8]
    kick = P(f'BAB {num}', 'h1kick')
    h = Paragraph(f'<a name="{key}"/>{num}. {title}', S['h1'])
    h.bookmark_name = key
    h.bookmark_level = 0
    h.bookmark_text = f'{num}. {title}'
    h.bookmark_key = key
    rule = HRFlowable(width='100%', thickness=2.2, color=ACCENT,
                      spaceBefore=6, spaceAfter=12)
    story.append(CondPageBreak(H1_ORPHAN))
    story.append(KeepTogether([kick, h, rule]))

def h2(story, text):
    story.append(Paragraph(text, S['h2']))

def h3(story, text):
    story.append(Paragraph(text, S['h3']))

def stat_row(story, stats):
    """Baris kotak statistik: [(nilai, label), ...]"""
    n = len(stats)
    gap = 8
    w = (CONTENT_W - gap * (n - 1)) / n
    cells, widths = [], []
    for i, (v, l) in enumerate(stats):
        box = Table([[Paragraph(f'<b>{v}</b>', S['stat_v'])],
                     [Paragraph(l, S['stat_l'])]], colWidths=[w])
        box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
            ('BOX', (0, 0), (-1, -1), 1, BORDER),
            ('LINEABOVE', (0, 0), (0, 0), 2.2, ACCENT),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
            ('TOPPADDING', (0, 1), (-1, 1), 0),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 9),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        cells.append(box)
        widths.append(w)
        if i < n - 1:
            cells.append('')
            widths.append(gap)
    row = Table([cells], colWidths=widths, hAlign='CENTER')
    row.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(Spacer(1, 6))
    story.append(row)
    story.append(Spacer(1, 12))

def callout(story, text, color=ACCENT, bg=CARD_BG):
    """Kotak sorotan dengan garis kiri aksen."""
    box = Table([[Paragraph(text, S['quote'])]], colWidths=[CONTENT_W - 4])
    box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('LINEBEFORE', (0, 0), (0, -1), 3, color),
        ('TOPPADDING', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(Spacer(1, 4))
    story.append(box)
    story.append(Spacer(1, 10))

def tbl(story, header, rows, ratios, caption=None, align_center_cols=None, fs=None):
    """Tabel standar: header gelap, baris belang, semua sel Paragraph."""
    align_center_cols = align_center_cols or []
    th, td, tdc = S['th'], S['td'], S['tdc']
    if fs:
        th = ParagraphStyle('thx', parent=S['th'], fontSize=fs, leading=fs + 2.8)
        td = ParagraphStyle('tdx', parent=S['td'], fontSize=fs, leading=fs + 3.2)
        tdc = ParagraphStyle('tdcx', parent=td, alignment=TA_CENTER)
    data = [[Paragraph(f'<b>{h}</b>', th) for h in header]]
    for r in rows:
        row = []
        for ci, c in enumerate(r):
            st = tdc if ci in align_center_cols else td
            row.append(Paragraph(str(c), st))
        data.append(row)
    widths = [ratio * CONTENT_W for ratio in ratios]
    assert sum(widths) <= CONTENT_W + 0.5, f'lebar tabel {sum(widths)} > {CONTENT_W}'
    t = Table(data, colWidths=widths, hAlign='CENTER', repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        style.append(('BACKGROUND', (0, i), (-1, i),
                      TABLE_ROW_ODD if i % 2 == 1 else TABLE_ROW_EVEN))
    t.setStyle(TableStyle(style))
    story.append(Spacer(1, 10))
    if caption:
        cap = Paragraph(caption, S['caption'])
        _, th = t.wrap(CONTENT_W, AVAIL_H)
        # KeepTogether hanya untuk tabel pendek (<=45% tinggi halaman) -
        # tabel tinggi dibiarkan terbelah dengan header berulang (repeatRows=1)
        if len(rows) <= 12 and th <= AVAIL_H * 0.45:
            story.append(KeepTogether([t, cap]))
        else:
            story.append(t)
            story.append(cap)
    else:
        story.append(t)
    story.append(Spacer(1, 10))

def fig(story, path, caption, max_h=300, max_w=None):
    """Gambar block-level dengan rasio terjaga + caption."""
    max_w = max_w or CONTENT_W
    im = PILImage.open(path)
    ow, oh = im.size
    ratio = min(max_w / ow, max_h / oh)
    img = Image(path, width=ow * ratio, height=oh * ratio)
    cap = Paragraph(caption, S['caption'])
    story.append(Spacer(1, 12))
    story.append(KeepTogether([img, Spacer(1, 4), cap]))
    story.append(Spacer(1, 10))

def fig_pair(story, path1, cap1, path2, cap2, max_h=330):
    """Dua gambar berdampingan (mis. screenshot mobile)."""
    w = (CONTENT_W - 14) / 2
    def mk(path, cap):
        im = PILImage.open(path)
        ow, oh = im.size
        ratio = min(w / ow, max_h / oh)
        img = Image(path, width=ow * ratio, height=oh * ratio)
        inner = Table([[img], [Paragraph(cap, S['caption'])]], colWidths=[w])
        inner.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        return inner
    duo = Table([[mk(path1, cap1), '', mk(path2, cap2)]], colWidths=[w, 14, w],
                hAlign='CENTER')
    duo.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(Spacer(1, 12))
    story.append(duo)
    story.append(Spacer(1, 8))

# ============ TEMPLATE DOKUMEN ============
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page - TOC_PAGES, key))

def on_page(canvas, doc):
    canvas.saveState()
    # latar halaman biru sangat muda
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # header
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 40, DOC_TITLE)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 40, 'Rumbela - Rumah Belajar Anak, Curup')
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1.4)
    canvas.line(MARGIN, PAGE_H - 46, PAGE_W - MARGIN, PAGE_H - 46)
    # footer
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN, 42, PAGE_W - MARGIN, 42)
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, 31, 'Audit independen - November 2026')
    page_label = 'i' if doc.page <= TOC_PAGES else str(doc.page - TOC_PAGES)
    canvas.drawRightString(PAGE_W - MARGIN, 31, page_label)
    canvas.restoreState()

def make_toc():
    toc = TableOfContents()
    toc.levelStyles = [S['toc0']]
    return toc
