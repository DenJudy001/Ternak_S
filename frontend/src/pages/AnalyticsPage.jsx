import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Wheat,
  Egg,
  AlertCircle,
  RefreshCw,
  Info,
  Award,
  BarChart3,
} from 'lucide-react'
import { getFCRAnalytics } from '../services/analyticsService'
import { getKandangList } from '../services/kandangService'

// Helper Universal Format Tanggal
export function formatLocalDate(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper kalkulasi tanggal preset FCR
export function calculatePresetDates(preset) {
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

export function AnalyticsPage() {
  const defaultDates = useMemo(() => calculatePresetDates('30days'), [])
  const [kandangList, setKandangList] = useState([])

  // FCR State - Diinisialisasi sinkron dengan default 30 hari (anti desync on mount)
  const [fcrPreset, setFcrPreset] = useState('30days')
  const [fcrStartDate, setFcrStartDate] = useState(defaultDates.start)
  const [fcrEndDate, setFcrEndDate] = useState(defaultDates.end)
  const [fcrKandangId, setFcrKandangId] = useState('')
  const [fcrData, setFcrData] = useState(null)
  const [fcrLoading, setFcrLoading] = useState(true)
  const [fcrError, setFcrError] = useState('')

  // Muat daftar kandang awal
  useEffect(() => {
    getKandangList()
      .then((data) => setKandangList(data || []))
      .catch((err) => console.error('Failed to fetch kandang:', err))
  }, [])

  // Fetch FCR
  const fetchFCR = useCallback(async () => {
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
  }, [fcrStartDate, fcrEndDate, fcrKandangId])

  useEffect(() => {
    let isCurrent = true

    if (!fcrStartDate || !fcrEndDate) return

    setFcrLoading(true)
    setFcrError('')

    const params = {
      start_date: fcrStartDate,
      end_date: fcrEndDate,
    }
    if (fcrKandangId) params.kandang_id = fcrKandangId

    getFCRAnalytics(params)
      .then((data) => {
        if (!isCurrent) return
        setFcrData(data)
      })
      .catch((err) => {
        if (!isCurrent) return
        console.error('Fetch FCR error:', err)
        setFcrError(err.message || 'Gagal memuat analitik FCR.')
      })
      .finally(() => {
        if (isCurrent) {
          setFcrLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [fcrStartDate, fcrEndDate, fcrKandangId])

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
            Monitoring rasio efisiensi pakan (Feed Conversion Ratio) dan perbandingan terhadap standar industri layer.
          </p>
        </div>

        <button
          onClick={fetchFCR}
          title="Segarkan data analitik FCR"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fcrLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analitik</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SECTION: KARTU ANALITIK FCR (FEED CONVERSION RATIO)            */}
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
    </div>
  )
}
