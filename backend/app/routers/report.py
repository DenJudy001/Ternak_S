"""
Router Layer: Report Export Endpoints

Menyediakan endpoint pengunduhan laporan bulanan komprehensif dalam format binary stream:
- GET /api/v1/reports/monthly/excel (.xlsx)
- GET /api/v1/reports/monthly/pdf (.pdf)
Diproteksi dengan Depends(get_current_user).
"""

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.exporters.excel_exporter import generate_monthly_excel_report
from app.services.exporters.pdf_exporter import generate_monthly_pdf_report
from app.services.report_assembler import assemble_monthly_report_data

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get(
    "/monthly/excel",
    summary="Ekspor Laporan Bulanan Excel (.xlsx)",
    description="Menghasilkan workbook spreadsheet Excel multi-tab berisi ringkasan finansial, performa produksi, FCR, stok gudang, dan rincian transaksi harian.",
)
def export_monthly_excel(
    tahun: int = Query(..., ge=2020, le=2035, description="Tahun laporan (2020 - 2035)"),
    bulan: int = Query(..., ge=1, le=12, description="Bulan laporan (1 - 12)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Agregasikan data bulanan
    report_data = assemble_monthly_report_data(db=db, tahun=tahun, bulan=bulan)

    # 2. Bangun binary stream Excel via openpyxl
    excel_stream = generate_monthly_excel_report(report_data)

    filename = f"Laporan_Bulanan_SiTernak_{tahun}_{bulan:02d}.xlsx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }

    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
        status_code=status.HTTP_200_OK,
    )


@router.get(
    "/monthly/pdf",
    summary="Ekspor Laporan Bulanan PDF (.pdf)",
    description="Menghasilkan dokumen PDF A4 komprehensif resmi siap cetak berisi ringkasan eksekutif, analisis keuangan, produksi, FCR, stok, dan lembar pengesahan.",
)
def export_monthly_pdf(
    tahun: int = Query(..., ge=2020, le=2035, description="Tahun laporan (2020 - 2035)"),
    bulan: int = Query(..., ge=1, le=12, description="Bulan laporan (1 - 12)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Agregasikan data bulanan
    report_data = assemble_monthly_report_data(db=db, tahun=tahun, bulan=bulan)

    # 2. Bangun binary stream PDF via ReportLab
    pdf_stream = generate_monthly_pdf_report(report_data)

    filename = f"Laporan_Bulanan_SiTernak_{tahun}_{bulan:02d}.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }

    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers=headers,
        status_code=status.HTTP_200_OK,
    )
