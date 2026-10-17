import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
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
  Plus,
  ArrowRight,
  Clock,
  X,
  Egg,
  ShoppingCart,
  Receipt,
} from 'lucide-react'
import { getDashboardSummary } from '../services/dashboardService'
import {
  formatRupiah,
  formatDisplayDateLong,
  formatChartDate,
} from '../utils/formatters'
import { Card, Badge } from '../components/common'

// Custom Tooltip untuk Mini Trend Chart (Light Theme)
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const prod = payload.find((p) => p.dataKey === 'butir_produksi')?.value || 0
    const sales = payload.find((p) => p.dataKey === 'butir_terjual')?.value || 0
    const selisih = prod - sales

    return (
      <div className="bg-white/95 border border-slate-200 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]">
        <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
          <span className="font-bold text-content-primary">{formatDisplayDateLong(label)}</span>
        </div>
        <div className="space-y-1.5 text-content-secondary">
          <div className="flex items-center justify-between">
            <span className="text-amber-700 flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              Panen Normal:
            </span>
            <span className="font-mono font-bold text-content-primary">
              {prod.toLocaleString('id-ID')} butir
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-purple-700 flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              Penjualan:
            </span>
            <span className="font-mono font-bold text-content-primary">
              {sales.toLocaleString('id-ID')} butir
            </span>
          </div>
          <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-content-muted">Net Mutasi:</span>
            <span
              className={`font-mono font-bold ${
                selisih >= 0 ? 'text-emerald-600' : 'text-rose-600'
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
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [trendDays, setTrendDays] = useState(7)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isFabOpen, setIsFabOpen] = useState(false)

  const fetchSummary = async (targetDate, days = trendDays) => {
    setLoading(true)
    setError('')
    try {
      const data = await getDashboardSummary(targetDate || undefined, days)
      setSummary(data)
    } catch (err) {
      console.error('Fetch dashboard summary error:', err)
      setError(err.message || 'Gagal memuat ringkasan eksekutif dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary(selectedDate, trendDays)
  }, [selectedDate, trendDays])

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value)
  }

  const handleResetToday = () => {
    setSelectedDate('')
  }

  return (
    <div className="space-y-5">
      {/* 1. Header Bar Dashboard: Tanggal, Popover Date Picker, & Desktop Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl bg-white border border-border-subtle shadow-xs relative">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-content-primary tracking-tight">
            Ringkasan Eksekutif Peternakan
          </h2>
          <div className="flex items-center gap-2 mt-1 relative flex-wrap">
            <p className="text-xs text-content-secondary font-medium">
              {summary
                ? formatDisplayDateLong(summary.tanggal_referensi)
                : 'Memuat data analitik...'}
            </p>

            {/* Icon Button Calendar untuk Popover Date Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                title="Pilih tanggal evaluasi"
                className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                  selectedDate
                    ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                    : 'bg-surface-muted border-border-subtle text-content-secondary hover:text-content-primary hover:border-slate-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
              </button>

              {/* Floating Popover Date Picker */}
              {showDatePicker && (
                <div className="absolute left-0 top-full mt-2 z-50 p-3 rounded-xl bg-white border border-border-subtle shadow-xl min-w-[220px]">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle">
                    <span className="text-xs font-bold text-content-primary">Pilih Tanggal</span>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(false)}
                      className="text-content-muted hover:text-content-primary transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      handleDateChange(e)
                      setShowDatePicker(false)
                    }}
                    className="w-full bg-surface-page border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs text-content-primary focus:outline-none focus:border-brand cursor-pointer"
                  />
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => {
                        handleResetToday()
                        setShowDatePicker(false)
                      }}
                      className="w-full mt-2 py-1 text-center text-xs text-brand hover:text-brand-hover font-semibold border border-brand/20 rounded-lg hover:bg-brand-light transition cursor-pointer"
                    >
                      Kembali ke Hari Ini
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Time-Travel Mode Badge Indicator */}
          {selectedDate && (
            <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <span>
                Melihat tanggal: <strong className="font-mono text-content-primary">{selectedDate}</strong>
              </span>
              <button
                type="button"
                onClick={handleResetToday}
                className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Desktop Quick Action Buttons (hidden on mobile < md) */}
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('produksi-telur')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            <span>Panen</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('penjualan')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-purple-600" />
            <span>Penjualan</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('pengeluaran')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Biaya</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => fetchSummary(selectedDate)}
            className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* PRIORITY #1 (Mobile & Desktop Alert): Banner Peringatan Kritis */}
      {summary && !summary.hdp_hari_ini.is_today_recorded && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <span className="font-bold text-sm block sm:inline">Panen Hari Ini Belum Dicatat!</span>
              <p className="text-xs text-amber-800 mt-0.5">
                Segera catat data produksi telur harian untuk memperbarui kalkulasi HDP dan stok riil gudang.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('produksi-telur')}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Catat Panen Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {summary && summary.stok_gudang.is_underflow && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
            </div>
            <div>
              <span className="font-bold text-sm block sm:inline">Defisit Stok Gudang Terdeteksi!</span>
              <p className="text-xs text-rose-800 mt-0.5">
                Total penjualan melebihi akumulasi panen riil. Segera periksa ledger mutasi stok.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('stok-telur')}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Buka Ledger Stok</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PRIORITY #2: Tiga (3) Hero KPI Cards (Stacked 1 Col on Mobile, 3 Col on Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* KPI 1: HDP Hari Ini */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-content-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-600" />
                HDP Hari Ini
              </span>
              {summary && (
                <Badge
                  variant={
                    summary.hdp_hari_ini.status_performa === 'prima'
                      ? 'success'
                      : summary.hdp_hari_ini.status_performa === 'standar'
                      ? 'warning'
                      : 'danger'
                  }
                  size="sm"
                >
                  {summary.hdp_hari_ini.status_performa.toUpperCase()}
                </Badge>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-black text-content-primary tracking-tight font-mono">
                {summary ? `${summary.hdp_hari_ini.persentase.toFixed(1)}%` : '--%'}
              </span>
              <span className="text-xs text-content-secondary font-medium">Produktivitas telur</span>
            </div>

            <p className="text-xs text-content-secondary leading-relaxed mb-3">
              {summary ? (
                <>
                  <span className="font-bold text-content-primary">
                    {summary.hdp_hari_ini.total_butir_normal.toLocaleString('id-ID')}
                  </span>{' '}
                  butir normal dari{' '}
                  <span className="font-bold text-content-primary">
                    {summary.hdp_hari_ini.total_populasi_efektif.toLocaleString('id-ID')}
                  </span>{' '}
                  ekor ayam aktif.
                </>
              ) : (
                'Menghitung rasio produksi...'
              )}
            </p>
          </div>

          <div className="pt-3 border-t border-border-subtle">
            {summary && summary.hdp_hari_ini.is_today_recorded ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Panen hari ini sudah tercatat.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Menampilkan referensi panen terakhir.</span>
              </div>
            )}
          </div>
        </Card>

        {/* KPI 2: Laba / Rugi Bulan Ini */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-content-secondary uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Laba / Rugi Bulan Ini
              </span>
              {summary && (
                <Badge
                  variant={
                    summary.keuangan_bulan_ini.status === 'untung'
                      ? 'success'
                      : summary.keuangan_bulan_ini.status === 'rugi'
                      ? 'danger'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {summary.keuangan_bulan_ini.status.toUpperCase()}
                </Badge>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span
                className={`text-3xl font-black font-mono tracking-tight ${
                  !summary
                    ? 'text-content-primary'
                    : summary.keuangan_bulan_ini.status === 'untung'
                    ? 'text-emerald-700'
                    : summary.keuangan_bulan_ini.status === 'rugi'
                    ? 'text-rose-700'
                    : 'text-content-primary'
                }`}
              >
                {summary
                  ? formatRupiah(summary.keuangan_bulan_ini.laba_rugi_bersih)
                  : 'Rp --'}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Badge
                variant={
                  summary && summary.keuangan_bulan_ini.margin_persen >= 0
                    ? 'success'
                    : 'danger'
                }
                size="sm"
              >
                {summary
                  ? `${summary.keuangan_bulan_ini.margin_persen >= 0 ? '+' : ''}${summary.keuangan_bulan_ini.margin_persen.toFixed(1)}% Margin`
                  : '0% Margin'}
              </Badge>
              <span className="text-xs text-content-secondary font-medium">Bulan berjalan</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border-subtle grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-content-secondary block text-[11px] font-medium">Pemasukan:</span>
              <span className="font-mono font-bold text-emerald-700">
                {summary ? formatRupiah(summary.keuangan_bulan_ini.total_pendapatan) : 'Rp 0'}
              </span>
            </div>
            <div>
              <span className="text-content-secondary block text-[11px] font-medium">Pengeluaran:</span>
              <span className="font-mono font-bold text-rose-700">
                {summary ? formatRupiah(summary.keuangan_bulan_ini.total_pengeluaran) : 'Rp 0'}
              </span>
            </div>
          </div>
        </Card>

        {/* KPI 3: Stok Telur Gudang */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-content-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-cyan-600" />
                Stok Telur Gudang
              </span>
              {summary && (
                <Badge
                  variant={
                    summary.stok_gudang.status_gudang === 'aman'
                      ? 'success'
                      : summary.stok_gudang.status_gudang === 'tipis'
                      ? 'warning'
                      : summary.stok_gudang.status_gudang === 'habis'
                      ? 'neutral'
                      : 'danger'
                  }
                  size="sm"
                >
                  {summary.stok_gudang.status_gudang.toUpperCase()}
                </Badge>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span
                className={`text-4xl font-black font-mono tracking-tight ${
                  summary && summary.stok_gudang.is_underflow
                    ? 'text-rose-700'
                    : 'text-content-primary'
                }`}
              >
                {summary
                  ? summary.stok_gudang.stok_tersedia.toLocaleString('id-ID')
                  : '--'}
              </span>
              <span className="text-xs text-content-secondary font-medium">butir siap jual</span>
            </div>

            <p className="text-xs text-content-secondary leading-relaxed mb-3">
              {summary ? (
                <>
                  Setara{' '}
                  <span className="font-bold text-content-primary font-mono">
                    {summary.stok_gudang.format_tray}
                  </span>{' '}
                  (~{summary.stok_gudang.estimasi_kg.toLocaleString('id-ID')} kg)
                </>
              ) : (
                'Mengagregasikan saldo gudang...'
              )}
            </p>
          </div>

          <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
            <button
              onClick={() => onNavigate('stok-telur')}
              className="text-brand hover:text-brand-hover inline-flex items-center gap-1 font-bold transition cursor-pointer"
            >
              <span>Buka Ledger Mutasi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>
      </div>

      {/* PRIORITY #3: Mini Trend Chart (Produksi vs Penjualan) */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-content-primary tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand" />
              Tren Produksi Telur vs Penjualan ({trendDays} Hari Terakhir)
            </h3>
            <p className="text-xs text-content-secondary">
              Perbandingan kurva panen normal harian (bar) terhadap volume telur terjual (line).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Periode Toggle Pills */}
            <div className="flex items-center bg-surface-muted p-1 rounded-xl border border-border-subtle text-xs">
              {[
                { days: 7, label: '7 Hari' },
                { days: 14, label: '14 Hari' },
                { days: 30, label: '30 Hari' },
              ].map((p) => (
                <button
                  key={p.days}
                  onClick={() => setTrendDays(p.days)}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    trendDays === p.days
                      ? 'bg-white text-brand shadow-xs'
                      : 'text-content-secondary hover:text-content-primary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs pl-1">
              <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold">
                <span className="w-3 h-3 rounded-sm bg-amber-500" />
                Panen Normal
              </span>
              <span className="inline-flex items-center gap-1.5 text-purple-700 font-semibold">
                <span className="w-3 h-1 bg-purple-500 rounded-full" />
                Penjualan
              </span>
            </div>
          </div>
        </div>

        {summary && summary.tren_7_hari && summary.tren_7_hari.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={summary.tren_7_hari}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="tanggal"
                  tickFormatter={formatChartDate}
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="butir_produksi"
                  name="Panen Normal"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Line
                  type="monotone"
                  dataKey="butir_terjual"
                  name="Penjualan"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#a855f7', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#9333ea', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-content-muted font-medium">
            Tidak ada data deret tren untuk periode terpilih.
          </div>
        )}
      </Card>

      {/* 4. Mobile Quick Action FAB & Speed Dial (positioned above BottomNav at bottom-20) */}
      {isFabOpen && (
        <>
          <div
            onClick={() => setIsFabOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
          />

          <div className="fixed bottom-24 right-4 z-50 md:hidden flex flex-col items-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsFabOpen(false)
                onNavigate('produksi-telur')
              }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white border border-border-subtle text-amber-700 shadow-xl active:scale-95 transition cursor-pointer"
            >
              <span className="text-xs font-bold text-content-primary">Catat Panen</span>
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Egg className="w-4 h-4 text-amber-700" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsFabOpen(false)
                onNavigate('penjualan')
              }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white border border-border-subtle text-purple-700 shadow-xl active:scale-95 transition cursor-pointer"
            >
              <span className="text-xs font-bold text-content-primary">Catat Penjualan</span>
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-purple-700" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsFabOpen(false)
                onNavigate('pengeluaran')
              }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white border border-border-subtle text-emerald-700 shadow-xl active:scale-95 transition cursor-pointer"
            >
              <span className="text-xs font-bold text-content-primary">Catat Pengeluaran</span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-emerald-700" />
              </div>
            </button>
          </div>
        </>
      )}

      {/* Floating Action Button (FAB) Mobile */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <button
          type="button"
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-lg active:scale-95 transition cursor-pointer"
        >
          <Plus className={`w-4 h-4 transition-transform duration-200 ${isFabOpen ? 'rotate-45' : ''}`} />
          <span>{isFabOpen ? 'Tutup' : 'Catat'}</span>
        </button>
      </div>
    </div>
  )
}

export default DashboardPage
