"""
Service Layer: PDF Exporter (ReportLab)

Menghasilkan dokumen PDF A4 resmi siap cetak untuk Laporan Bulanan Komprehensif SiTernak:
- Kop Laporan resmi peternakan
- Executive Summary KPI Grid (Laba Bersih, Rata-rata HDP, FCR, Saldo Akhir Stok)
- Bagian Keuangan & Pengeluaran
- Bagian Performa Produksi & Pakan
- Bagian Rekonsiliasi Inventaris Gudang
- Kolom Pengesahan Tanda Tangan
Mengembalikan stream biner io.BytesIO in-memory.
"""

from datetime import date
from io import BytesIO
from typing import Any, Dict

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Palet Warna Korporat
COLOR_PRIMARY = colors.HexColor("#1E293B")      # Slate 800
COLOR_SECONDARY = colors.HexColor("#0F766E")    # Teal 700
COLOR_TEXT = colors.HexColor("#0F172A")         # Slate 900
COLOR_MUTED = colors.HexColor("#64748B")        # Slate 500
COLOR_BORDER = colors.HexColor("#CBD5E1")       # Slate 300
COLOR_BG_CARD = colors.HexColor("#F1F5F9")      # Slate 100
COLOR_BG_ZEBRA = colors.HexColor("#F8FAFC")     # Slate 50
COLOR_ACCENT_GREEN = colors.HexColor("#059669") # Emerald 600
COLOR_ACCENT_RED = colors.HexColor("#DC2626")   # Rose 600


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas untuk menghitung total halaman dan menggambar footer halaman presisi.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_MUTED)

        # Garis batas footer
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.5)
        self.line(36, 36, 595.27 - 36, 36)

        # Teks footer
        footer_text = "SiTernak - Sistem Manajemen Peternakan Ayam Petelur | Dokumen Resmi"
        page_text = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawString(36, 24, footer_text)
        self.drawRightString(595.27 - 36, 24, page_text)
        self.restoreState()


def _format_rupiah(nominal: float) -> str:
    """Format angka ke format mata uang Rupiah standar."""
    if nominal < 0:
        return f"-Rp {abs(nominal):,.0f}".replace(",", ".")
    return f"Rp {nominal:,.0f}".replace(",", ".")


def generate_monthly_pdf_report(data: Dict[str, Any]) -> BytesIO:
    """
    Menghasilkan dokumen PDF A4 komprehensif siap cetak dari data laporan bulanan.
    """
    buffer = BytesIO()

    # Dimensi kertas A4: 595.27 x 841.89 pt. Margin: 36 pt (0.5 inci)
    # Area aktif: 595.27 - 72 = 523.27 pt
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=46,
        title=f"Laporan Bulanan SiTernak - {data['periode_label']}",
        author="SiTernak System",
    )

    styles = getSampleStyleSheet()

    # Custom Styles
    style_kop_title = ParagraphStyle(
        "KopTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=COLOR_PRIMARY,
    )
    style_kop_sub = ParagraphStyle(
        "KopSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=COLOR_MUTED,
    )
    style_section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=COLOR_PRIMARY,
        spaceBefore=10,
        spaceAfter=4,
    )
    style_table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
    style_cell_left = ParagraphStyle(
        "CellLeft",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=COLOR_TEXT,
        alignment=TA_LEFT,
    )
    style_cell_left_bold = ParagraphStyle(
        "CellLeftBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=COLOR_PRIMARY,
        alignment=TA_LEFT,
    )
    style_cell_right = ParagraphStyle(
        "CellRight",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=COLOR_TEXT,
        alignment=TA_RIGHT,
    )
    style_cell_right_bold = ParagraphStyle(
        "CellRightBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=COLOR_PRIMARY,
        alignment=TA_RIGHT,
    )
    style_cell_center = ParagraphStyle(
        "CellCenter",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=COLOR_TEXT,
        alignment=TA_CENTER,
    )
    style_kpi_label = ParagraphStyle(
        "KpiLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        textColor=COLOR_MUTED,
        alignment=TA_CENTER,
    )
    style_kpi_val = ParagraphStyle(
        "KpiVal",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=COLOR_PRIMARY,
        alignment=TA_CENTER,
    )
    style_kpi_sub = ParagraphStyle(
        "KpiSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9,
        textColor=COLOR_MUTED,
        alignment=TA_CENTER,
    )

    story = []

    # 1. Kop Surat Resmi
    kop_data = [
        [
            Paragraph("<b>SITERNAK</b><br/><font size=8 color='#475569'>Sistem Manajemen Peternakan Ayam Petelur Modern</font>", style_kop_title),
            Paragraph(
                f"<b>LAPORAN BULANAN KOMPREHENSIF</b><br/>"
                f"<font color='#0F766E'><b>Periode: {data['periode_label'].upper()}</b></font><br/>"
                f"<font size=7.5 color='#64748B'>Tanggal Cetak: {data['tanggal_cetak']} | Standar SNI</font>",
                ParagraphStyle("KopRight", parent=styles["Normal"], alignment=TA_RIGHT)
            )
        ]
    ]
    kop_table = Table(kop_data, colWidths=[260, 263])
    kop_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(kop_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_PRIMARY, spaceAfter=8, spaceBefore=2))

    # 2. Executive Summary Grid (4 KPI Cards)
    kpi_col_w = 523.27 / 4.0
    pnl_color = COLOR_ACCENT_GREEN if data["finansial"]["laba_rugi_bersih"] >= 0 else COLOR_ACCENT_RED
    
    kpi_card_1 = [
        [Paragraph("LABA / RUGI BERSIH", style_kpi_label)],
        [Paragraph(f"<font color='{pnl_color.hexval()}'>{_format_rupiah(data['finansial']['laba_rugi_bersih'])}</font>", style_kpi_val)],
        [Paragraph(f"Margin: {data['finansial']['margin_persen']:.1f}% ({data['finansial']['status_pnl'].upper()})", style_kpi_sub)],
    ]
    kpi_card_2 = [
        [Paragraph("RATA-RATA HDP", style_kpi_label)],
        [Paragraph(f"{data['produksi']['rata_rata_hdp']:.2f}%", style_kpi_val)],
        [Paragraph(f"Panen: {data['produksi']['total_panen']:,} butir", style_kpi_sub)],
    ]
    kpi_card_3 = [
        [Paragraph("SKOR FCR PAKAN", style_kpi_label)],
        [Paragraph(f"{data['fcr']['fcr']:.2f}", style_kpi_val)],
        [Paragraph(f"Status: {data['fcr']['status_efisiensi'].replace('_', ' ').title()}", style_kpi_sub)],
    ]
    kpi_card_4 = [
        [Paragraph("STOK AKHIR GUDANG", style_kpi_label)],
        [Paragraph(f"{data['stok']['saldo_akhir']:,} btr", style_kpi_val)],
        [Paragraph(f"Status: {data['stok']['status'].upper()}", style_kpi_sub)],
    ]

    t_kpi1 = Table(kpi_card_1, colWidths=[kpi_col_w - 6])
    t_kpi2 = Table(kpi_card_2, colWidths=[kpi_col_w - 6])
    t_kpi3 = Table(kpi_card_3, colWidths=[kpi_col_w - 6])
    t_kpi4 = Table(kpi_card_4, colWidths=[kpi_col_w - 6])

    kpi_grid_data = [[t_kpi1, t_kpi2, t_kpi3, t_kpi4]]
    kpi_table = Table(kpi_grid_data, colWidths=[kpi_col_w] * 4)
    kpi_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_CARD),
        ("BOX", (0, 0), (0, 0), 0.5, COLOR_BORDER),
        ("BOX", (1, 0), (1, 0), 0.5, COLOR_BORDER),
        ("BOX", (2, 0), (2, 0), 0.5, COLOR_BORDER),
        ("BOX", (3, 0), (3, 0), 0.5, COLOR_BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # 3. Bagian 1: Keuangan & Pengeluaran
    story.append(Paragraph("1. KEUANGAN & BEBAN OPERASIONAL BULANAN", style_section_heading))

    fin_rows = [
        [
            Paragraph("Pos Anggaran Keuangan", style_table_header),
            Paragraph("Arus Kas", style_table_header),
            Paragraph("Nominal (Rp)", style_table_header),
            Paragraph("Porsi (%)", style_table_header),
        ],
        [
            Paragraph("Pendapatan Penjualan Telur", style_cell_left_bold),
            Paragraph("Pemasukan", style_cell_center),
            Paragraph(_format_rupiah(data["finansial"]["total_pendapatan"]), style_cell_right_bold),
            Paragraph("100.0%", style_cell_center),
        ],
    ]

    tot_pend = max(data["finansial"]["total_pendapatan"], 1.0)
    for kat, nom in sorted(data["finansial"]["breakdown_kategori"].items()):
        porsi = (float(nom) / tot_pend) * 100.0
        fin_rows.append([
            Paragraph(f"Beban {kat.replace('_', ' ').title()}", style_cell_left),
            Paragraph("Pengeluaran", style_cell_center),
            Paragraph(_format_rupiah(float(nom)), style_cell_right),
            Paragraph(f"{porsi:.1f}%", style_cell_center),
        ])

    fin_rows.append([
        Paragraph("Total Beban Operasional", style_cell_left_bold),
        Paragraph("Subtotal", style_cell_center),
        Paragraph(_format_rupiah(data["finansial"]["total_pengeluaran"]), style_cell_right_bold),
        Paragraph(f"{(data['finansial']['total_pengeluaran']/tot_pend)*100:.1f}%", style_cell_center),
    ])
    fin_rows.append([
        Paragraph("LABA / RUGI BERSIH BULANAN", style_cell_left_bold),
        Paragraph("Net Result", style_cell_center),
        Paragraph(_format_rupiah(data["finansial"]["laba_rugi_bersih"]), style_cell_right_bold),
        Paragraph(f"{data['finansial']['margin_persen']:.1f}%", style_cell_center),
    ])

    t_fin = Table(fin_rows, colWidths=[230, 93, 120, 80])
    t_fin.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
        ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, -2), (-1, -2), 1, COLOR_PRIMARY),
        ("LINEBELOW", (0, -1), (-1, -1), 1.5, COLOR_PRIMARY),
        ("BACKGROUND", (0, -1), (-1, -1), COLOR_BG_CARD),
    ]))
    story.append(t_fin)
    story.append(Spacer(1, 10))

    # 4. Bagian 2: Performa Produksi & Pakan (FCR)
    story.append(Paragraph("2. PERFORMA PRODUKSI TELUR & EFISIENSI PAKAN", style_section_heading))

    tot_panen_safe = max(data["produksi"]["total_panen"], 1)
    prod_table_rows = [
        [
            Paragraph("Parameter Produksi", style_table_header),
            Paragraph("Kuantitas (Butir)", style_table_header),
            Paragraph("Bobot (Kg)", style_table_header),
            Paragraph("Proporsi / Evaluasi", style_table_header),
        ],
        [
            Paragraph("Telur Normal (Grade A)", style_cell_left),
            Paragraph(f"{data['produksi']['total_normal']:,}", style_cell_right),
            Paragraph(f"{data['produksi']['total_normal'] * 0.06:,.1f} kg", style_cell_right),
            Paragraph(f"{(data['produksi']['total_normal']/tot_panen_safe)*100:.1f}%", style_cell_center),
        ],
        [
            Paragraph("Telur Retak (Grade B)", style_cell_left),
            Paragraph(f"{data['produksi']['total_retak']:,}", style_cell_right),
            Paragraph(f"{data['produksi']['total_retak'] * 0.06:,.1f} kg", style_cell_right),
            Paragraph(f"{(data['produksi']['total_retak']/tot_panen_safe)*100:.1f}%", style_cell_center),
        ],
        [
            Paragraph("Telur Pecah (Reject)", style_cell_left),
            Paragraph(f"{data['produksi']['total_pecah']:,}", style_cell_right),
            Paragraph(f"{data['produksi']['total_pecah'] * 0.06:,.1f} kg", style_cell_right),
            Paragraph(f"{(data['produksi']['total_pecah']/tot_panen_safe)*100:.1f}%", style_cell_center),
        ],
        [
            Paragraph("TOTAL PANEN FISIK", style_cell_left_bold),
            Paragraph(f"{data['produksi']['total_panen']:,}", style_cell_right_bold),
            Paragraph(f"{data['produksi']['total_panen'] * 0.06:,.1f} kg", style_cell_right_bold),
            Paragraph("100.0%", style_cell_center),
        ],
        [
            Paragraph("Konsumsi Pakan Terpakai", style_cell_left_bold),
            Paragraph("-", style_cell_center),
            Paragraph(f"{data['fcr']['total_kg_pakan']:,.1f} kg", style_cell_right_bold),
            Paragraph(f"FCR: {data['fcr']['fcr']:.2f} ({data['fcr']['status_efisiensi'].upper()})", style_cell_center),
        ],
    ]

    t_prod = Table(prod_table_rows, colWidths=[200, 110, 103, 110])
    t_prod.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_SECONDARY),
        ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 4), (-1, 4), 1, COLOR_SECONDARY),
        ("BACKGROUND", (0, 4), (-1, 4), COLOR_BG_ZEBRA),
        ("BACKGROUND", (0, 5), (-1, 5), COLOR_BG_CARD),
    ]))
    story.append(t_prod)
    story.append(Spacer(1, 10))

    # 5. Bagian 3: Rekonsiliasi Inventaris Gudang
    story.append(Paragraph("3. REKONSILIASI INVENTARIS STOK TELUR GUDANG", style_section_heading))

    stok_table_rows = [
        [
            Paragraph("Aliran Mutasi Inventaris", style_table_header),
            Paragraph("Kuantitas (Butir)", style_table_header),
            Paragraph("Estimasi (Tray)", style_table_header),
            Paragraph("Status Audit", style_table_header),
        ],
        [
            Paragraph("Saldo Awal Gudang (Tanggal 1)", style_cell_left),
            Paragraph(f"{data['stok']['saldo_awal']:,}", style_cell_right),
            Paragraph(f"{data['stok']['saldo_awal'] / 30.0:.1f} tray", style_cell_right),
            Paragraph("Stok Terbawa", style_cell_center),
        ],
        [
            Paragraph("Total Panen Layak Jual (+ Normal & Retak)", style_cell_left),
            Paragraph(f"+{data['stok']['total_masuk_layak']:,}", style_cell_right),
            Paragraph(f"{data['stok']['total_masuk_layak'] / 30.0:.1f} tray", style_cell_right),
            Paragraph("Penambahan", style_cell_center),
        ],
        [
            Paragraph("Total Penjualan Terdistribusi (- Keluar)", style_cell_left),
            Paragraph(f"-{data['stok']['total_keluar_terjual']:,}", style_cell_right),
            Paragraph(f"{data['stok']['total_keluar_terjual'] / 30.0:.1f} tray", style_cell_right),
            Paragraph("Pengurangan", style_cell_center),
        ],
        [
            Paragraph("SALDO AKHIR TELUR SIAP JUAL", style_cell_left_bold),
            Paragraph(f"{data['stok']['saldo_akhir']:,}", style_cell_right_bold),
            Paragraph(f"{data['stok']['saldo_akhir'] / 30.0:.1f} tray", style_cell_right_bold),
            Paragraph(f"STATUS: {data['stok']['status'].upper()}", style_cell_center),
        ],
    ]

    t_stok = Table(stok_table_rows, colWidths=[220, 100, 103, 100])
    t_stok.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
        ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("BACKGROUND", (0, -1), (-1, -1), COLOR_BG_CARD),
        ("LINEBELOW", (0, -1), (-1, -1), 1.5, COLOR_PRIMARY),
    ]))
    story.append(t_stok)
    story.append(Spacer(1, 14))

    # 6. Kolom Pengesahan Tanda Tangan
    sign_data = [
        [
            Paragraph("Diverifikasi Oleh:", style_cell_left),
            Paragraph(f"Disahkan pada: {data['tanggal_cetak'].strftime('%d %B %Y')}", style_cell_right),
        ],
        [Spacer(1, 35), Spacer(1, 35)],
        [
            Paragraph("<b>( ____________________________ )</b><br/><font size=7.5 color='#64748B'>Kepala Bagian Operasional & Gudang</font>", style_cell_left),
            Paragraph("<b>( ____________________________ )</b><br/><font size=7.5 color='#64748B'>Pemilik Peternakan / General Manager</font>", style_cell_right),
        ],
    ]
    sign_table = Table(sign_data, colWidths=[260, 263])
    sign_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(KeepTogether([sign_table]))

    # Bangun dokumen PDF via NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
