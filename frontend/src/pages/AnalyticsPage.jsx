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
import {
  formatLocalDate,
  formatNumber,
} from '../utils/formatters'
import {
  Card,
  Badge,
  PageHeader,
} from '../components/common'

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

  // FCR State
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
    <div className="space-y-6">
      {/* Header Halaman */}
      <PageHeader
        title="Analitik Performa & Efisiensi FCR"
        subtitle="Monitoring rasio konversi pakan (Feed Conversion Ratio) dan perbandingan terhadap standar industri layer komersial."
        action={
          <button
            onClick={fetchFCR}
            title="Segarkan data analitik FCR"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 border border-border-subtle text-content-primary transition text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${fcrLoading ? 'animate-spin text-brand' : ''}`} />
            <span>Refresh Analitik</span>
          </button>
        }
      />

      {/* SECTION: KARTU ANALITIK FCR (FEED CONVERSION RATIO) */}
      <Card className="p-5 sm:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2">
              <Wheat className="w-5 h-5 text-brand" />
              <h3 className="text-lg font-bold text-content-primary tracking-tight">
                Feed Conversion Ratio (FCR)
              </h3>
            </div>
            <p className="text-xs text-content-secondary mt-0.5">
              Rasio efisiensi kilogram pakan yang dikonsumsi terhadap kilogram telur layak jual yang dihasilkan.
            </p>
          </div>

          {/* Filter Bar Periode & Kandang */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Preset Buttons */}
            <div className="flex items-center bg-surface-muted p-1 rounded-xl border border-border-subtle text-xs">
              {[
                { id: '7days', label: '7 Hari' },
                { id: '30days', label: '30 Hari' },
                { id: 'this_month', label: 'Bulan Ini' },
                { id: 'custom', label: 'Kustom' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-3 py-1.5 min-h-[38px] rounded-lg font-bold transition cursor-pointer ${
                    fcrPreset === p.id
                      ? 'bg-white text-brand shadow-xs'
                      : 'text-content-secondary hover:text-content-primary'
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
              className="bg-surface-page border border-border-subtle rounded-xl px-3 py-2 min-h-[44px] text-xs font-semibold text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
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
          <div className="flex items-center gap-3 p-3 bg-surface-page rounded-xl border border-border-subtle text-xs">
            <span className="text-content-secondary font-medium">Rentang Kustom:</span>
            <input
              type="date"
              value={fcrStartDate}
              onChange={(e) => setFcrStartDate(e.target.value)}
              className="bg-white border border-border-subtle rounded-xl px-2.5 py-1.5 min-h-[44px] text-content-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <span className="text-content-secondary font-medium">s/d</span>
            <input
              type="date"
              value={fcrEndDate}
              onChange={(e) => setFcrEndDate(e.target.value)}
              className="bg-white border border-border-subtle rounded-xl px-2.5 py-1.5 min-h-[44px] text-content-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        )}

        {fcrError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{fcrError}</span>
          </div>
        )}

        {/* Visualisasi Kartu FCR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Nilai Utama FCR */}
          <div className="p-5 rounded-2xl bg-surface-page border border-border-subtle relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-content-secondary uppercase tracking-wider">
                  Skor FCR Periode
                </span>
                {fcrData && (
                  <Badge
                    variant={
                      fcrData.status_efisiensi === 'sangat_efisien'
                        ? 'success'
                        : fcrData.status_efisiensi === 'standar'
                        ? 'info'
                        : fcrData.status_efisiensi === 'boros'
                        ? 'danger'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {fcrData.status_efisiensi.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </div>

              <div className="flex items-baseline gap-2 my-2">
                <span className="text-5xl font-black font-mono tracking-tight text-content-primary">
                  {fcrData && fcrData.fcr > 0 ? fcrData.fcr.toFixed(2) : '--'}
                </span>
                <span className="text-xs text-content-secondary font-medium">kg pakan / kg telur</span>
              </div>
            </div>

            <p className="text-xs text-content-secondary leading-relaxed mt-2">
              {fcrData?.keterangan || 'Menghitung rasio konversi pakan...'}
            </p>
          </div>

          {/* Rincian Aliran Pakan vs Telur */}
          <div className="p-5 rounded-2xl bg-surface-page border border-border-subtle flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-content-secondary uppercase tracking-wider block mb-3">
                Volume Input vs Output
              </span>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-border-subtle">
                  <span className="text-content-secondary flex items-center gap-1.5 font-medium">
                    <Wheat className="w-4 h-4 text-brand" />
                    Konsumsi Pakan:
                  </span>
                  <span className="font-mono font-bold text-content-primary">
                    {fcrData ? formatNumber(fcrData.total_kg_pakan) : '0'} kg
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-border-subtle">
                  <span className="text-content-secondary flex items-center gap-1.5 font-medium">
                    <Egg className="w-4 h-4 text-amber-600" />
                    Telur Dihasilkan:
                  </span>
                  <span className="font-mono font-bold text-content-primary">
                    {fcrData ? formatNumber(fcrData.total_kg_telur) : '0'} kg
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] px-1 text-content-secondary">
                  <span>Estimasi Butir Layak Jual:</span>
                  <span className="font-mono font-semibold text-content-primary">
                    ~{fcrData ? formatNumber(fcrData.total_butir_telur) : '0'} butir
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-content-muted pt-3 border-t border-border-subtle mt-2">
              Asumsi bobot standar industri: 60 gram / butir (0.06 kg)
            </div>
          </div>

          {/* Benchmark Industri Layer */}
          <div className="p-5 rounded-2xl bg-surface-muted/60 border border-border-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-content-primary uppercase tracking-wider">
                  Benchmark Standar Industri
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                  <span>Sangat Efisien</span>
                  <span className="font-mono font-bold">&le; 2.10</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-semibold">
                  <span>Standar Komersial</span>
                  <span className="font-mono font-bold">2.11 - 2.35</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                  <span>Perlu Evaluasi (Boros)</span>
                  <span className="font-mono font-bold">&gt; 2.35</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[11px] text-purple-900 flex items-start gap-2 mt-3 font-medium">
              <Info className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
              <span>Biaya pakan merepresentasikan 70–75% ongkos operasional peternakan layer.</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default AnalyticsPage
