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
  ReferenceLine,
} from 'recharts'
import {
  Activity,
  Wheat,
  Egg,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Info,
  Layers,
  Sparkles,
  Award,
  Filter,
  BarChart3,
  Scale,
  ArrowRight,
} from 'lucide-react'
import { getFCRAnalytics, getProductionTrend } from '../services/analyticsService'
import { getKandangList } from '../services/kandangService'

// Helper Universal Format Rupiah / Tanggal
function formatLocalDate(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDisplayDate(dateString) {
  if (!dateString) return '-'
  try {
    const [y, m, d] = dateString.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(dateObj)
  } catch {
    return dateString
  }
}

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

// Custom Tooltip Recharts untuk Grafik Tren Produksi 30 Hari
function CustomTrendTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
        <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
          <span className="font-semibold text-white">{formatDisplayDate(data.tanggal)}</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              data.is_recorded
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {data.is_recorded ? 'Tercatat' : 'Belum Ada Entri'}
          </span>
        </div>

        <div className="space-y-1 text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Normal:
            </span>
            <span className="font-mono font-bold text-white">
              {data.butir_normal.toLocaleString('id-ID')} butir
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Retak:
            </span>
            <span className="font-mono font-bold text-white">
              {data.butir_retak.toLocaleString('id-ID')} butir
            </span>
          </div>

          {data.butir_pecah > 0 && (
            <div className="flex items-center justify-between text-rose-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Pecah (Afkir):
              </span>
              <span className="font-mono font-bold">
                {data.butir_pecah.toLocaleString('id-ID')} butir
              </span>
            </div>
          )}

          <div className="border-t border-slate-800/80 pt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Populasi Aktif:</span>
            <span className="font-mono font-semibold text-slate-200">
              {data.populasi_aktif.toLocaleString('id-ID')} ekor
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-purple-400 font-medium">HDP:</span>
            <span className="font-mono font-bold text-purple-300">
              {data.hdp_persen.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function AnalyticsPage() {
  const [kandangList, setKandangList] = useState([])

  // FCR State
  const [fcrPreset, setFcrPreset] = useState('30days')
  const [fcrStartDate, setFcrStartDate] = useState('')
  const [fcrEndDate, setFcrEndDate] = useState('')
  const [fcrKandangId, setFcrKandangId] = useState('')
  const [fcrData, setFcrData] = useState(null)
  const [fcrLoading, setFcrLoading] = useState(true)
  const [fcrError, setFcrError] = useState('')

  // 30-Day Trend State
  const [trendKandangId, setTrendKandangId] = useState('')
  const [trendData, setTrendData] = useState(null)
  const [trendLoading, setTrendLoading] = useState(true)
  const [trendError, setTrendError] = useState('')

  // Helper kalkulasi tanggal preset FCR
  const calculatePresetDates = (preset) => {
    const today = new Date()
    const end = formatLocalDate(today)
    if (preset === '7days') {
      const past7 = new Date()
      past7.setDate(today.getDate() - 6)
      return { start: formatLocalDate(past7), end }
    } else if (preset === '30days') {
      const past30 = new Date()
      past30.setDate(today.getDate() - 29)
      return { start: formatLocalDate(past30), end }
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: formatLocalDate(firstDay), end: formatLocalDate(lastDay) }
    }
    return { start: '', end: '' }
  }

  // Muat daftar kandang awal
  useEffect(() => {
    getKandangList()
      .then((data) => setKandangList(data || []))
      .catch((err) => console.error('Failed to fetch kandang:', err))

    const { start, end } = calculatePresetDates('30days')
    setFcrStartDate(start)
    setFcrEndDate(end)
  }, [])

  // Fetch FCR
  const fetchFCR = async () => {
    if (!fcrStartDate || !fcrEndDate) return
    setFcrLoading(true)
    setFcrError('')
    try {
      const params = {
        start_date: fcrStartDate,
        end_date: fcrEndDate,
      }
      if (fcrKandangId) params.kandang_id = fcrKandangId
      const data = await getFCRAnalytics(params)
      setFcrData(data)
    } catch (err) {
      console.error('Fetch FCR error:', err)
      setFcrError(err.message || 'Gagal memuat analitik FCR.')
    } finally {
      setFcrLoading(false)
    }
  }

  useEffect(() => {
    fetchFCR()
  }, [fcrStartDate, fcrEndDate, fcrKandangId])

  // Fetch 30-Day Trend
  const fetchTrend = async () => {
    setTrendLoading(true)
    setTrendError('')
    try {
      const params = { days: 30 }
      if (trendKandangId) params.kandang_id = trendKandangId
      const data = await getProductionTrend(params)
      setTrendData(data)
    } catch (err) {
      console.error('Fetch trend error:', err)
      setTrendError(err.message || 'Gagal memuat tren produksi.')
    } finally {
      setTrendLoading(false)
    }
  }

  useEffect(() => {
    fetchTrend()
  }, [trendKandangId])

  const handlePresetChange = (preset) => {
    setFcrPreset(preset)
    if (preset !== 'custom') {
      const { start, end } = calculatePresetDates(preset)
      setFcrStartDate(start)
      setFcrEndDate(end)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Analitik Performa & FCR
            </h2>
          </div>
          <p className="text-sm text-slate-400">
            Monitoring rasio efisiensi pakan (Feed Conversion Ratio) dan visualisasi tren panen telur 30 hari kontinu.
          </p>
        </div>

        <button
          onClick={() => {
            fetchFCR()
            fetchTrend()
          }}
          title="Segarkan data analitik"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fcrLoading || trendLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analitik</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: KARTU ANALITIK FCR (FEED CONVERSION RATIO)          */}
      {/* ============================================================== */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Wheat className="w-4 h-4 text-emerald-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">
                Feed Conversion Ratio (FCR)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Rasio efisiensi kilogram pakan yang dikonsumsi terhadap kilogram telur layak jual yang dihasilkan.
            </p>
          </div>

          {/* Filter Bar Periode & Kandang */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Preset Buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { id: '7days', label: '7 Hari' },
                { id: '30days', label: '30 Hari' },
                { id: 'this_month', label: 'Bulan Ini' },
                { id: 'custom', label: 'Kustom' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    fcrPreset === p.id
                      ? 'bg-purple-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Dropdown Kandang */}
            <select
              value={fcrKandangId}
              onChange={(e) => setFcrKandangId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            >
              <option value="">Semua Kandang (Farm Total)</option>
              {kandangList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kandang}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Form Input Tanggal Kustom jika Dipilih */}
        {fcrPreset === 'custom' && (
          <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
            <span className="text-slate-400">Rentang Kustom:</span>
            <input
              type="date"
              value={fcrStartDate}
              onChange={(e) => setFcrStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-purple-500"
            />
            <span className="text-slate-500">s/d</span>
            <input
              type="date"
              value={fcrEndDate}
              onChange={(e) => setFcrEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        )}

        {fcrError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fcrError}</span>
          </div>
        )}

        {/* Visualisasi Kartu FCR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Nilai Utama FCR */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Skor FCR Periode
                </span>
                {fcrData && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      fcrData.status_efisiensi === 'sangat_efisien'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : fcrData.status_efisiensi === 'standar'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : fcrData.status_efisiensi === 'boros'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {fcrData.status_efisiensi.replace('_', ' ')}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 my-2">
                <span className="text-5xl font-black font-mono tracking-tight text-white">
                  {fcrData && fcrData.fcr > 0 ? fcrData.fcr.toFixed(2) : '--'}
                </span>
                <span className="text-xs text-slate-400">kg pakan / kg telur</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              {fcrData?.keterangan || 'Menghitung rasio konversi pakan...'}
            </p>
          </div>

          {/* Rincian Aliran Pakan vs Telur */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                Volume Input vs Output
              </span>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Wheat className="w-4 h-4 text-emerald-400" />
                    Konsumsi Pakan:
                  </span>
                  <span className="font-mono font-bold text-white">
                    {fcrData ? fcrData.total_kg_pakan.toLocaleString('id-ID') : '0'} kg
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Egg className="w-4 h-4 text-amber-400" />
                    Telur Dihasilkan:
                  </span>
                  <span className="font-mono font-bold text-white">
                    {fcrData ? fcrData.total_kg_telur.toLocaleString('id-ID') : '0'} kg
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                  <span>Estimasi Butir Layak Jual:</span>
                  <span className="font-mono font-medium text-slate-300">
                    ~{fcrData ? fcrData.total_butir_telur.toLocaleString('id-ID') : '0'} butir
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-900 mt-2">
              Asumsi bobot standar industri: 60 gram / butir (0.06 kg)
            </div>
          </div>

          {/* Benchmark Industri Layer */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-950/80 to-slate-950 border border-purple-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Benchmark Standar Industri
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span>Sangat Efisien</span>
                  <span className="font-mono font-bold">&le; 2.10</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                  <span>Standar Komersial</span>
                  <span className="font-mono font-bold">2.11 - 2.35</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                  <span>Perlu Evaluasi (Boros)</span>
                  <span className="font-mono font-bold">&gt; 2.35</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 flex items-start gap-2 mt-3">
              <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
              <span>Biaya pakan merepresentasikan 70–75% ongkos operasional peternakan layer.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 2: GRAFIK TREN PRODUKSI 30 HARI KONTINU (RECHARTS)     */}
      {/* ============================================================== */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">
                Tren Produksi Telur & Kurva HDP (30 Hari Terakhir)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualisasi time-series kontinu tanpa tanggal bolong membandingkan volume panen (normal & retak) terhadap persentase HDP%.
            </p>
          </div>

          {/* Filter Kandang untuk Grafik */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Kandang:
            </span>
            <select
              value={trendKandangId}
              onChange={(e) => setTrendKandangId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            >
              <option value="">Semua Kandang</option>
              {kandangList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kandang}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Summary Header Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 text-xs block mb-1">Rata-rata HDP 30 Hari:</span>
            <span className="text-2xl font-black font-mono text-purple-400">
              {trendData ? `${trendData.rata_rata_hdp.toFixed(1)}%` : '--%'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 text-xs block mb-1">Total Panen Normal:</span>
            <span className="text-2xl font-black font-mono text-emerald-400">
              {trendData ? trendData.total_butir_normal_30d.toLocaleString('id-ID') : '0'}{' '}
              <span className="text-xs font-normal text-slate-400">butir</span>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 text-xs block mb-1">Rekor HDP Tertinggi:</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-amber-400">
                {trendData ? `${trendData.peak_hdp_persen.toFixed(1)}%` : '--%'}
              </span>
              {trendData?.peak_hdp_tanggal && (
                <span className="text-[11px] text-slate-400">
                  ({formatDisplayDate(trendData.peak_hdp_tanggal)})
                </span>
              )}
            </div>
          </div>
        </div>

        {trendError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{trendError}</span>
          </div>
        )}

        {/* Recharts ComposedChart: Stacked Bar + Line HDP% */}
        {trendData && trendData.points && trendData.points.length > 0 ? (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trendData.points}
                margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis
                  dataKey="tanggal"
                  tickFormatter={formatChartDate}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                {/* Sumbu Y Kiri: Volume Butir Telur */}
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                />
                {/* Sumbu Y Kanan: Persentase HDP% */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="#c084fc"
                  fontSize={11}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip content={<CustomTrendTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                />
                {/* Garis Horizontal Target HDP 85% */}
                <ReferenceLine
                  yAxisId="right"
                  y={85}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Target 85%',
                    fill: '#f59e0b',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="butir_normal"
                  name="Telur Normal"
                  stackId="telur"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  yAxisId="left"
                  dataKey="butir_retak"
                  name="Telur Retak"
                  stackId="telur"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="hdp_persen"
                  name="HDP (%)"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#a855f7', stroke: '#1e1b4b', strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: '#c084fc', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-xs text-slate-500 font-medium">
            Tidak ada data tren produksi yang dapat ditampilkan.
          </div>
        )}
      </div>
    </div>
  )
}
