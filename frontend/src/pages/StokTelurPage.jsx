import React, { useState, useEffect } from 'react'
import { getStokSummary, getStokMutasi } from '../services/stokService'
import {
  Boxes,
  Egg,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Layers,
  Scale,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react'

// Helper format angka Indonesia
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return '0'
  return Number(num).toLocaleString('id-ID')
}

// Helper format tanggal display lokal (DD MMM YYYY)
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

// Helper format YYYY-MM-DD
function formatLocalDate(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function StokTelurPage() {
  const [summary, setSummary] = useState(null)
  const [ledgerData, setLedgerData] = useState({
    start_date: null,
    end_date: null,
    saldo_awal: 0,
    total_records: 0,
    items: [],
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Filter States
  const [datePreset, setDatePreset] = useState('all') // 'all' | 'this_month' | '30days' | '7days' | 'today' | 'custom'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Load Data
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      // 1. Fetch live summary
      const summaryRes = await getStokSummary()
      setSummary(summaryRes)

      // 2. Fetch mutasi ledger with current filters
      const filterParams = {}
      if (startDate) filterParams.start_date = startDate
      if (endDate) filterParams.end_date = endDate

      const mutasiRes = await getStokMutasi(filterParams)
      setLedgerData(mutasiRes)
    } catch (err) {
      setError(err.message || 'Gagal memuat data stok dan mutasi telur.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  // Handler Preset Tanggal
  const handlePresetChange = (presetId) => {
    setDatePreset(presetId)
    const today = new Date()

    if (presetId === 'all') {
      setStartDate('')
      setEndDate('')
    } else if (presetId === 'today') {
      const todayStr = formatLocalDate(today)
      setStartDate(todayStr)
      setEndDate(todayStr)
    } else if (presetId === '7days') {
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(today.getDate() - 6)
      setStartDate(formatLocalDate(sevenDaysAgo))
      setEndDate(formatLocalDate(today))
    } else if (presetId === '30days') {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 29)
      setStartDate(formatLocalDate(thirtyDaysAgo))
      setEndDate(formatLocalDate(today))
    } else if (presetId === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setStartDate(formatLocalDate(firstDay))
      setEndDate(formatLocalDate(lastDay))
    }
  }

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'aman':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Aman (&gt; 100)
          </span>
        )
      case 'tipis':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Stok Tipis
          </span>
        )
      case 'habis':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Habis (0)
          </span>
        )
      case 'defisit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Defisit (&lt; 0)
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-2">
            <Boxes className="w-3.5 h-3.5" />
            <span>Manajemen Inventaris Gudang • Derived Ledger State</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Stok & Mutasi Telur Gudang
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Kalkulasi on-the-fly saldo stok siap jual, konversi fisik tray & kg, serta pelacakan buku mutasi harian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition text-xs font-medium shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Sinkronkan Data'}</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-xs animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* Deficit / Underflow Warning Banner */}
      {summary && summary.stok_tersedia < 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 via-rose-900/30 to-slate-900/60 border-2 border-rose-500/60 shadow-lg shadow-rose-950/40 animate-in fade-in duration-200">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <span>Peringatan Audit: Jumlah Telur Terjual Melebihi Catatan Panen Layak Jual</span>
                <span className="text-xs font-mono bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded-md border border-rose-500/40">
                  Defisit {formatNumber(Math.abs(summary.stok_tersedia))} Butir
                </span>
              </h4>
              <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">
                Peringatan Audit: Jumlah telur terjual melebihi total catatan panen layak jual. Periksa riwayat input produksi atau penjualan.
                Kemungkinan terjadi salah input kuantitas transaksi penjualan atau ada catatan panen harian yang belum tercatat di sistem.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Stok Telur Tersedia */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/30 via-slate-900/80 to-slate-900/60 border border-cyan-500/30 shadow-lg shadow-cyan-950/20 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Boxes className="w-5 h-5" />
            </div>
            {summary ? renderStatusBadge(summary.status_stok) : <div className="h-6 w-20 bg-slate-800 animate-pulse rounded-full" />}
          </div>

          <p className="text-xs text-slate-400 font-medium">Stok Telur Tersedia (Gudang)</p>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className={`text-3xl font-black tracking-tight font-mono ${
              summary && summary.stok_tersedia < 0 ? 'text-rose-400' : 'text-white'
            }`}>
              {summary ? formatNumber(summary.stok_tersedia) : '...'}
            </h3>
            <span className="text-xs text-slate-400 font-medium">Butir Siap Jual</span>
          </div>

          {/* Sub-label Representasi Fisik */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Estimasi Rak/Tray:
              </span>
              <span className="font-mono font-semibold text-cyan-300">
                {summary ? `~${summary.tray} Tray + ${summary.butir_eceran} Butir` : '...'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                Estimasi Bobot Fisik:
              </span>
              <span className="font-mono font-semibold text-amber-300">
                {summary ? `~${summary.estimasi_kg} kg` : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Akumulasi Panen Masuk */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/20 via-slate-900/80 to-slate-900/60 border border-emerald-500/20 shadow-lg shadow-emerald-950/10">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Egg className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              Panen Masuk
            </span>
          </div>

          <p className="text-xs text-slate-400 font-medium">Akumulasi Telur Layak Jual</p>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tight text-white font-mono">
              {summary ? formatNumber(summary.total_layak_jual) : '...'}
            </h3>
            <span className="text-xs text-slate-400 font-medium">Butir Masuk</span>
          </div>

          {/* Rincian Badge: Normal vs Retak */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Kualitas Normal:</span>
              <span className="font-mono font-semibold text-emerald-400">
                {summary ? `${formatNumber(summary.total_normal)} butir` : '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Kualitas Retak (Layak):</span>
              <span className="font-mono font-semibold text-amber-400">
                {summary ? `${formatNumber(summary.total_retak)} butir` : '...'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 pt-0.5">
              Total Panen Kotor: {summary ? formatNumber(summary.total_produksi) : '...'} butir
            </div>
          </div>
        </div>

        {/* Card 3: Akumulasi Pengurangan */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/20 via-slate-900/80 to-slate-900/60 border border-purple-500/20 shadow-lg shadow-purple-950/10">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" />
              Aliran Keluar
            </span>
          </div>

          <p className="text-xs text-slate-400 font-medium">Akumulasi Pengurangan</p>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tight text-white font-mono">
              {summary ? formatNumber(summary.total_terjual + summary.total_rusak) : '...'}
            </h3>
            <span className="text-xs text-slate-400 font-medium">Butir Keluar / Rusak</span>
          </div>

          {/* Rincian Badge: Terjual vs Rusak */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Terjual Komersial:</span>
              <span className="font-mono font-semibold text-purple-300">
                {summary ? `${formatNumber(summary.total_terjual)} butir` : '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Rusak/Pecah Panen:</span>
              <span className="font-mono font-semibold text-rose-400">
                {summary ? `${formatNumber(summary.total_rusak)} butir` : '...'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 pt-0.5">
              Afkir dibuang & tidak masuk stok siap jual
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar Preset & Tanggal */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 text-xs">
          {[
            { id: 'all', label: 'Semua Waktu' },
            { id: 'this_month', label: 'Bulan Ini' },
            { id: '30days', label: '30 Hari Terakhir' },
            { id: '7days', label: '7 Hari Terakhir' },
            { id: 'today', label: 'Hari Ini' },
            { id: 'custom', label: 'Kustom' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id)}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                datePreset === p.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Inputs if Custom */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent focus:outline-none"
              />
            </div>
            <span className="text-slate-500">s/d</span>
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stock Ledger Mutasi Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Buku Mutasi &amp; Saldo Berjalan (Stock Ledger)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Aliran telur masuk (panen), telur rusak (pecah), dan telur keluar (penjualan) berurutan kronologis.
            </p>
          </div>

          {startDate && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Saldo Awal Terbawa:</span>
              <span className="font-mono font-bold text-cyan-400">
                {formatNumber(ledgerData.saldo_awal)} butir
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4 text-right">Telur Masuk (Layak)</th>
                <th className="py-3 px-4 text-right">Telur Rusak (Pecah)</th>
                <th className="py-3 px-4 text-right">Telur Keluar (Terjual)</th>
                <th className="py-3 px-4 text-right">Netto Harian</th>
                <th className="py-3 px-4 text-right">Saldo Akhir</th>
                <th className="py-3 px-4 text-center">Status Harian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat deret mutasi ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : ledgerData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-8 h-8 text-slate-600" />
                      <p className="text-slate-400 font-medium">Belum ada catatan mutasi produksi atau penjualan.</p>
                      <p className="text-xs text-slate-600">Catat panen pada modul Produksi Telur atau transaksi pada Penjualan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                ledgerData.items.map((row, idx) => {
                  return (
                    <tr key={`${row.tanggal}-${idx}`} className="hover:bg-slate-800/40 transition">
                      {/* Tanggal */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-white">{formatDisplayDate(row.tanggal)}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{row.tanggal}</div>
                      </td>

                      {/* Telur Masuk Layak */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {row.masuk_layak > 0 ? (
                          <div>
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                              +{formatNumber(row.masuk_layak)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              N: {formatNumber(row.masuk_normal)} | R: {formatNumber(row.masuk_retak)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono">-</span>
                        )}
                      </td>

                      {/* Telur Rusak (Pecah) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {row.rusak_pecah > 0 ? (
                          <span className="font-mono font-medium text-rose-400">
                            {formatNumber(row.rusak_pecah)}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">-</span>
                        )}
                      </td>

                      {/* Telur Keluar (Terjual) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {row.keluar_terjual > 0 ? (
                          <span className="font-mono font-bold text-purple-400 text-sm">
                            -{formatNumber(row.keluar_terjual)}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">-</span>
                        )}
                      </td>

                      {/* Perubahan Netto */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-semibold">
                        {row.perubahan_netto > 0 ? (
                          <span className="text-emerald-400">+{formatNumber(row.perubahan_netto)}</span>
                        ) : row.perubahan_netto < 0 ? (
                          <span className="text-rose-400">{formatNumber(row.perubahan_netto)}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>

                      {/* Saldo Akhir Gudang */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`font-mono font-bold text-sm ${
                          row.saldo_akhir < 0 ? 'text-rose-400' : 'text-cyan-300'
                        }`}>
                          {formatNumber(row.saldo_akhir)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">butir</span>
                      </td>

                      {/* Status Harian */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {renderStatusBadge(row.status_harian)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default StokTelurPage
