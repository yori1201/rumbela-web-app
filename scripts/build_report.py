#!/usr/bin/env python3
"""Build laporan audit Rumbela Live: body (ReportLab) + cover -> PDF final."""
import os, sys

sys.path.insert(0, '/home/z/my-project/scripts')
from report_common import (TocDocTemplate, make_toc, on_page, S, MARGIN, TOP_M, BOT_M,
                           DOC_TITLE, TOC_PAGES, A4, Paragraph, Spacer, PageBreak,
                           HRFlowable, ACCENT, P)
import report_content_a as ca
import report_content_c as cc
import report_content_b as cb

BODY = '/home/z/my-project/audit/body.pdf'
COVER = '/home/z/my-project/audit/cover.pdf'
FINAL = '/home/z/my-project/download/Laporan_Audit_Rumbela_Live.pdf'


def build_body():
    story = []
    # ---- Halaman Daftar Isi ----
    story.append(Paragraph('Daftar Isi', S['toc_t']))
    story.append(HRFlowable(width='100%', thickness=2.2, color=ACCENT,
                            spaceBefore=0, spaceAfter=16))
    story.append(make_toc())
    story.append(PageBreak())

    # ---- Isi bab ----
    ca.bab1(story)
    ca.bab2(story)
    ca.bab3(story)
    ca.bab4(story)
    cb.bab5(story)
    cb.bab6(story)
    cb.bab7(story)
    cc.bab8(story)
    cc.bab9(story)
    cc.bab10(story)

    # buang Spacer/CondPageBreak buntutan agar tidak menciptakan halaman yatim
    while story and (isinstance(story[-1], Spacer) or isinstance(story[-1], PageBreak)):
        story.pop()

    doc = TocDocTemplate(
        BODY, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=TOP_M, bottomMargin=BOT_M,
        title=DOC_TITLE, author='Z.ai', creator='Z.ai',
        subject='Audit dan rekomendasi upgrade web app Rumbela Live',
    )
    doc.multiBuild(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f'body OK -> {BODY}')


def merge():
    from pypdf import PdfReader, PdfWriter
    A4_W, A4_H = 595.28, 841.89

    def normalize(page):
        w, h = float(page.mediabox.width), float(page.mediabox.height)
        if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
            page.scale_to(A4_W, A4_H)
        return page

    writer = PdfWriter()
    writer.add_page(normalize(PdfReader(COVER).pages[0]))
    for pg in PdfReader(BODY).pages:
        writer.add_page(normalize(pg))
    writer.add_metadata({
        '/Title': DOC_TITLE,
        '/Author': 'Z.ai',
        '/Creator': 'Z.ai',
        '/Subject': 'Audit dan rekomendasi upgrade web app Rumbela Live',
    })
    os.makedirs(os.path.dirname(FINAL), exist_ok=True)
    with open(FINAL, 'wb') as f:
        writer.write(f)
    n = len(PdfReader(FINAL).pages)
    print(f'final OK -> {FINAL} ({n} halaman)')


if __name__ == '__main__':
    build_body()
    merge()
