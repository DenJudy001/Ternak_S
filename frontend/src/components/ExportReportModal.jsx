import React, { useState } from 'react'
import {
  X,
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

  if (!isOpen) return null

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

  // Generate opsi tahun (misal: 2024 s.d. 2028)
  const tahunOptions = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ]

  const namaBulanTerpilih = BULAN_LIST.find((b) => b.value === Number(bulan))?.label || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Ekspor Laporan Bulanan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Unduh rekapitulasi data peternakan dalam format Excel & PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loadingExcel || loadingPdf}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Filter Periode: Tahun & Bulan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Pilih Bulan</span>
              </label>
              <select
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
                disabled={loadingExcel || loadingPdf}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
              >
                {BULAN_LIST.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Pilih Tahun</span>
              </label>
              <select
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                disabled={loadingExcel || loadingPdf}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
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
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Cakupan Data Rekapitulasi ({namaBulanTerpilih} {tahun}):
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Finansial Laba / Rugi MTD</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Rata-rata HDP & Tren Harian</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Efisiensi Pakan & FCR</span>
              </div>
              <div className="flex items-center gap-2">
                <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                <span>Rekonsiliasi Stok Gudang</span>
              </div>
            </div>
          </div>

          {/* Tombol Aksi Unduhan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Tombol Unduh Excel */}
            <button
              onClick={handleDownloadExcel}
              disabled={loadingExcel || loadingPdf}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
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

            {/* Tombol Unduh PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={loadingExcel || loadingPdf}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-lg shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
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

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Format file: .xlsx (Multi-tab) & .pdf (A4 Print-ready)</span>
          <button
            onClick={onClose}
            disabled={loadingExcel || loadingPdf}
            className="text-slate-400 hover:text-slate-200 font-medium transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
