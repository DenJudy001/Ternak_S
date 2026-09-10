import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import {
  Activity,
  DollarSign,
  Boxes,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Plus,
  ArrowRight,
  Home,
  Egg,
  TrendingDown,
  Receipt,
  ShoppingCart,
  Layers,
  Sparkles,
  Info,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { getDashboardSummary } from '../services/dashboardService'
import { useAuth } from '../context/AuthContext'

// Helper Universal Format Rupiah
function formatRupiah(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Helper Format Tanggal Indonesia Lengkap
function formatDisplayDateLong(dateString) {
  if (!dateString) return '-'
  try {
    const [y, m, d] = dateString.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(dateObj)
  } catch {
    return dateString
  }
}

// Helper Format Tanggal Ringkas untuk Sumbu Chart (DD Mon)
function formatChartDate(dateString) {
  if (!dateString) return ''
  try {
    const [y, m, d] = dateString.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(dateObj)
  } catch {
    return dateString
  }
}

// Custom Glassmorphic Tooltip untuk Mini Trend Chart
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const prod = payload.find((p) => p.dataKey === 'butir_produksi')?.value || 0
    const sales = payload.find((p) => p.dataKey === 'butir_terjual')?.value || 0
    const selisih = prod - sales

    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[190px]">
        <div className="border-b border-slate-800 pb-1 flex items-center justify-between">
          <span className="font-semibold text-white">{formatDisplayDateLong(label)}</span>
        </div>
        <div className="space-y-1 text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Panen Normal:
            </span>
            <span className="font-mono font-bold text-white">
              {prod.toLocaleString('id-ID')} butir
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-purple-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Penjualan:
            </span>
            <span className="font-mono font-bold text-white">
              {sales.toLocaleString('id-ID')} butir
            </span>
          </div>
          <div className="border-t border-slate-800/80 pt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Net Mutasi:</span>
            <span
              className={`font-mono font-semibold ${
                selisih >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {selisih >= 0 ? `+${selisih}` : selisih} butir
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function DashboardPage({ onNavigate }) {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  const fetchSummary = async (targetDate) => {
    setLoading(true)
    setError('')
    try {
      const data = await getDashboardSummary(targetDate || undefined)
      setSummary(data)
    } catch (err) {
      console.error('Fetch dashboard summary error:', err)
      setError(err.message || 'Gagal memuat ringkasan eksekutif dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary(selectedDate)
  }, [selectedDate])

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value)
  }

  const handleResetToday = () => {
    setSelectedDate('')
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Bar Dashboard: Tanggal, Status Sinkronisasi, & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800 relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync API
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {summary ? `Ref: ${summary.tanggal_referensi}` : ''}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Ringkasan Eksekutif Peternakan
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {summary
              ? formatDisplayDateLong(summary.tanggal_referensi)
              : 'Memuat data analitik...'}
          </p>
        </div>

        {/* Action Controls: Date Picker & Quick Entry Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              title="Pilih tanggal evaluasi dashboard"
              className="bg-transparent border-none text-slate-200 text-xs focus:outline-none cursor-pointer"
            />
            {selectedDate && (
              <button
                onClick={handleResetToday}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 ml-1 font-semibold underline"
              >
                Hari Ini
              </button>
            )}
          </div>

          <button
            onClick={() => fetchSummary(selectedDate)}
            title="Muat ulang data"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Quick Action Shortcuts */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onNavigate('produksi-telur')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Panen</span>
            </button>
            <button
              onClick={() => onNavigate('penjualan')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Penjualan</span>
            </button>
            <button
              onClick={() => onNavigate('pengeluaran')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Biaya</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchSummary(selectedDate)}
            className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 font-semibold"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 2. Tiga (3) Hero KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KPI 1: HDP Hari Ini */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-400" />
                HDP Hari Ini
              </span>
              {summary && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    summary.hdp_hari_ini.status_performa === 'prima'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : summary.hdp_hari_ini.status_performa === 'standar'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {summary.hdp_hari_ini.status_performa}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-black text-white tracking-tight font-mono">
                {summary ? `${summary.hdp_hari_ini.persentase.toFixed(1)}%` : '--%'}
              </span>
              <span className="text-xs text-slate-400">Hen-Day Production</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              {summary ? (
                <>
                  <span className="font-semibold text-white">
                    {summary.hdp_hari_ini.total_butir_normal.toLocaleString('id-ID')}
                  </span>{' '}
                  butir normal dari{' '}
                  <span className="font-semibold text-white">
                    {summary.hdp_hari_ini.total_populasi_efektif.toLocaleString('id-ID')}
                  </span>{' '}
                  ekor ayam aktif.
                </>
              ) : (
                'Menghitung rasio produksi...'
              )}
            </p>
          </div>

          {/* Contextual Warning jika Panen Hari Ini Belum Diinput (Pagi Hari) */}
          {summary && !summary.hdp_hari_ini.is_today_recorded && (
            <div
              onClick={() => onNavigate('produksi-telur')}
              className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-300 cursor-pointer hover:bg-amber-500/20 transition group"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span>Panen hari ini belum dicatat. Menampilkan referensi terakhir </span>
                <span className="font-bold text-amber-200">
                  ({summary.hdp_hari_ini.tanggal_referensi_produksi || 'N/A'})
                </span>
                . <span className="underline group-hover:text-white font-medium">Klik untuk input &rarr;</span>
              </div>
            </div>
          )}

          {summary && summary.hdp_hari_ini.is_today_recorded && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Data panen hari ini sudah tercatat lengkap.</span>
            </div>
          )}
        </div>

        {/* KPI 2: Laba / Rugi Bulan Ini (MTD) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Laba / Rugi Bulan Ini (MTD)
              </span>
              {summary && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    summary.keuangan_bulan_ini.status === 'untung'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : summary.keuangan_bulan_ini.status === 'rugi'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                  }`}
                >
                  {summary.keuangan_bulan_ini.status}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span
                className={`text-3xl font-black font-mono tracking-tight ${
                  !summary
                    ? 'text-white'
                    : summary.keuangan_bulan_ini.status === 'untung'
                    ? 'text-emerald-400'
                    : summary.keuangan_bulan_ini.status === 'rugi'
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {summary
                  ? formatRupiah(summary.keuangan_bulan_ini.laba_rugi_bersih)
                  : 'Rp --'}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  !summary
                    ? 'bg-slate-800 text-slate-400'
                    : summary.keuangan_bulan_ini.margin_persen >= 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {summary
                  ? `${summary.keuangan_bulan_ini.margin_persen >= 0 ? '+' : ''}${summary.keuangan_bulan_ini.margin_persen.toFixed(1)}% Margin`
                  : '0% Margin'}
              </span>
              <span className="text-[11px] text-slate-400">Month-to-Date</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Penjualan (In):</span>
              <span className="font-mono font-semibold text-white">
                {summary ? formatRupiah(summary.keuangan_bulan_ini.total_pendapatan) : 'Rp 0'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Beban Operasional:</span>
              <span className="font-mono font-semibold text-rose-300">
                {summary ? formatRupiah(summary.keuangan_bulan_ini.total_pengeluaran) : 'Rp 0'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Stok Telur Gudang */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-cyan-400" />
                Stok Telur Gudang
              </span>
              {summary && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    summary.stok_gudang.status_gudang === 'aman'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : summary.stok_gudang.status_gudang === 'tipis'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : summary.stok_gudang.status_gudang === 'habis'
                      ? 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  }`}
                >
                  {summary.stok_gudang.status_gudang}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span
                className={`text-4xl font-black font-mono tracking-tight ${
                  !summary
                    ? 'text-white'
                    : summary.stok_gudang.is_underflow
                    ? 'text-rose-400'
                    : 'text-white'
                }`}
              >
                {summary
                  ? summary.stok_gudang.stok_tersedia.toLocaleString('id-ID')
                  : '--'}
              </span>
              <span className="text-xs text-slate-400">butir siap jual</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {summary ? (
                <>
                  Setara{' '}
                  <span className="font-semibold text-white font-mono">
                    {summary.stok_gudang.format_tray}
                  </span>{' '}
                  (~{summary.stok_gudang.estimasi_kg.toLocaleString('id-ID')} kg)
                </>
              ) : (
                'Mengagregasikan saldo gudang...'
              )}
            </p>
          </div>

          {/* Warning Banner jika Status Stok Defisit / Underflow */}
          {summary && summary.stok_gudang.is_underflow && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-start gap-2 text-[11px] text-rose-300 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="font-bold">Defisit Stok Gudang! </span>
                Penjualan melebihi stok panen riil. Segera periksa ledger mutasi.
              </div>
            </div>
          )}

          {summary && !summary.stok_gudang.is_underflow && (
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <button
                onClick={() => onNavigate('stok-telur')}
                className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-medium transition"
              >
                <span>Buka Ledger Mutasi</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Mini Trend Chart: Perbandingan Produksi vs Penjualan (7 Hari Terakhir) */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Tren Produksi Telur vs Penjualan (7 Hari Terakhir)
            </h3>
            <p className="text-xs text-slate-400">
              Perbandingan kurva panen normal harian (bar) terhadap volume telur terjual (line).
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-3 h-3 rounded-sm bg-amber-500/80" />
              Panen Normal
            </span>
            <span className="inline-flex items-center gap-1.5 text-purple-400 font-medium">
              <span className="w-3 h-1 bg-purple-500 rounded-full" />
              Penjualan
            </span>
          </div>
        </div>

        {summary && summary.tren_7_hari && summary.tren_7_hari.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={summary.tren_7_hari}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis
                  dataKey="tanggal"
                  tickFormatter={formatChartDate}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="butir_produksi"
                  name="Panen Normal"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Line
                  type="monotone"
                  dataKey="butir_terjual"
                  name="Penjualan"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#a855f7', stroke: '#1e1b4b', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#c084fc', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-slate-500 font-medium">
            Tidak ada data deret tren untuk periode terpilih.
          </div>
        )}
      </div>

      {/* 4. Core Operational Modules Access Grid */}
      <div className="pt-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Akses Modul Operasional
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Kandang */}
          <div
            onClick={() => onNavigate('kandang')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group shadow-sm hover:shadow-emerald-500/5"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                <Home className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition">
              Manajemen Kandang
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Kelola data kandang, populasi ayam, dan status aktif/afkir.
            </p>
          </div>

          {/* Produksi Telur */}
          <div
            onClick={() => onNavigate('produksi-telur')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer group shadow-sm hover:shadow-amber-500/5"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                <Egg className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="font-bold text-white text-sm group-hover:text-amber-400 transition">
              Produksi Telur
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Catat panen butir normal, retak, pecah, dan evaluasi HDP%.
            </p>
          </div>

          {/* Mortalitas Ayam */}
          <div
            onClick={() => onNavigate('kandang')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/50 transition cursor-pointer group shadow-sm hover:shadow-rose-500/5"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition">
                <TrendingDown className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-rose-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="font-bold text-white text-sm group-hover:text-rose-400 transition">
              Mortalitas Ayam
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Monitoring kematian harian dan penyesuaian populasi efektif.
            </p>
          </div>

          {/* Biaya & Pengeluaran */}
          <div
            onClick={() => onNavigate('pengeluaran')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group shadow-sm hover:shadow-emerald-500/5"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                <Receipt className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition">
              Biaya Operasional
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pencatatan pakan (kg), obat/vaksin, gaji, dan biaya operasional.
            </p>
          </div>

          {/* Penjualan Telur */}
          <div
            onClick={() => onNavigate('penjualan')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition cursor-pointer group shadow-sm hover:shadow-purple-500/5"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="font-bold text-white text-sm group-hover:text-purple-400 transition">
              Penjualan Telur
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Catat transaksi jual butir/tray/kg dan mutasi fisik keluar.
            </p>
          </div>

          {/* Stok Gudang */}
          <div
            onClick={() => onNavigate('stok-telur')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer group shadow-sm hover:shadow-cyan-500/5"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
                <Boxes className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="font-bold text-white text-sm group-hover:text-cyan-400 transition">
              Stok & Ledger Mutasi
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pantau saldo on-the-fly, konversi rak/kg, dan riwayat mutasi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
