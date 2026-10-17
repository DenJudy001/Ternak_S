import React, { useState } from 'react'
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Activity,
  Boxes,
} from 'lucide-react'
import { exportMonthlyExcel, exportMonthlyPdf } from '../services/reportService'
import { Modal } from './common'

const BULAN_LIST = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
]

export function ExportReportModal({ isOpen, onClose }) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [tahun, setTahun] = useState(currentYear)
  const [bulan, setBulan] = useState(currentMonth)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const handleDownloadExcel = async () => {
    try {
      setError(null)
      setSuccessMsg(null)
      setLoadingExcel(true)
      await exportMonthlyExcel(Number(tahun), Number(bulan))
      setSuccessMsg('Laporan Excel berhasil diunduh.')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      setError(err.message || 'Gagal mengunduh berkas Excel.')
    } finally {
      setLoadingExcel(false)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      setError(null)
      setSuccessMsg(null)
      setLoadingPdf(true)
      await exportMonthlyPdf(Number(tahun), Number(bulan))
      setSuccessMsg('Laporan PDF siap cetak berhasil diunduh.')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      setError(err.message || 'Gagal mengunduh berkas PDF.')
    } finally {
      setLoadingPdf(false)
    }
  }

  const tahunOptions = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ]

  const namaBulanTerpilih = BULAN_LIST.find((b) => b.value === Number(bulan))?.label || ''

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ekspor Laporan Bulanan"
      subtitle="Unduh rekapitulasi data peternakan dalam format Excel & PDF."
      icon={<FileSpreadsheet className="w-5 h-5 text-brand" />}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-xs">
        {/* Feedback Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* Filter Periode: Tahun & Bulan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-content-secondary" />
              <span>Pilih Bulan</span>
            </label>
            <select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              disabled={loadingExcel || loadingPdf}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3 py-2.5 min-h-[44px] text-xs font-semibold text-content-primary focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer disabled:opacity-50"
            >
              {BULAN_LIST.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-content-secondary" />
              <span>Pilih Tahun</span>
            </label>
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              disabled={loadingExcel || loadingPdf}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3 py-2.5 min-h-[44px] text-xs font-semibold text-content-primary focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer disabled:opacity-50"
            >
              {tahunOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cakupan Data Laporan */}
        <div className="p-4 rounded-xl bg-surface-page border border-border-subtle space-y-2.5">
          <span className="text-[11px] font-bold text-content-primary uppercase tracking-wider block">
            Cakupan Data Rekapitulasi ({namaBulanTerpilih} {tahun}):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-content-secondary">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Finansial Laba / Rugi MTD</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand" />
              <span>Rata-rata HDP &amp; Tren Harian</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>Efisiensi Pakan &amp; FCR</span>
            </div>
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-cyan-600" />
              <span>Rekonsiliasi Stok Gudang</span>
            </div>
          </div>
        </div>

        {/* Tombol Aksi Unduhan (min-h-[44px]) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleDownloadExcel}
            disabled={loadingExcel || loadingPdf}
            className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {loadingExcel ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyusun Excel...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh Excel (.xlsx)</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={loadingExcel || loadingPdf}
            className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {loadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Merender PDF...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Unduh PDF (.pdf)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  )
}

export default ExportReportModal
