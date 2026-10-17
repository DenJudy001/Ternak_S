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
import {
  formatLocalDate,
  formatDisplayDate,
  formatNumber,
} from '../utils/formatters'
import {
  Card,
  Badge,
  PageHeader,
  EmptyState,
} from '../components/common'

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
  const [datePreset, setDatePreset] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Load Data
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const summaryRes = await getStokSummary()
      setSummary(summaryRes)

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

  // Status Badge Helper using shared Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'aman':
        return (
          <Badge variant="cool" size="sm">
            AMAN (&gt; 100)
          </Badge>
        )
      case 'tipis':
        return (
          <Badge variant="warning" size="sm">
            STOK TIPIS
          </Badge>
        )
      case 'habis':
        return (
          <Badge variant="neutral" size="sm">
            HABIS (0)
          </Badge>
        )
      case 'defisit':
        return (
          <Badge variant="danger" size="sm" icon={<AlertTriangle className="w-3 h-3" />}>
            DEFISIT (&lt; 0)
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-5">
      {/* Header Page */}
      <PageHeader
        title="Stok & Mutasi Telur Gudang"
        subtitle="Kalkulasi on-the-fly saldo stok siap jual, konversi fisik tray & kg, serta pelacakan buku mutasi harian (Stock Ledger)."
        action={
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 border border-border-subtle text-content-primary transition text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Sinkronkan Data'}</span>
          </button>
        }
      />

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* Deficit / Underflow Warning Banner */}
      {summary && summary.stok_tersedia < 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 flex items-center gap-2 flex-wrap">
                <span>Peringatan Audit: Jumlah Telur Terjual Melebihi Catatan Panen Layak Jual</span>
                <span className="text-xs font-mono font-bold bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-md border border-rose-300">
                  Defisit {formatNumber(Math.abs(summary.stok_tersedia))} Butir
                </span>
              </h4>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                Peringatan Audit: Jumlah telur terjual melebihi total catatan panen layak jual. Periksa riwayat input produksi atau penjualan.
                Kemungkinan terjadi salah input kuantitas transaksi penjualan atau ada catatan panen harian yang belum tercatat di sistem.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Stok Telur Tersedia */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                <Boxes className="w-5 h-5" />
              </div>
              {summary ? renderStatusBadge(summary.status_stok) : <div className="h-6 w-20 bg-surface-muted animate-pulse rounded-full" />}
            </div>

            <p className="text-xs text-content-secondary font-bold uppercase tracking-wider">Stok Telur Tersedia (Gudang)</p>
            <div className="mt-1 flex items-baseline gap-2">
              <h3 className={`text-3xl font-black tracking-tight font-mono ${summary && summary.stok_tersedia < 0 ? 'text-rose-700' : 'text-content-primary'
                }`}>
                {summary ? formatNumber(summary.stok_tersedia) : '...'}
              </h3>
              <span className="text-xs text-content-secondary font-medium">Butir Siap Jual</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-content-secondary flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-cyan-600" />
                Estimasi Rak/Tray:
              </span>
              <span className="font-mono font-bold text-cyan-800">
                {summary ? `~${summary.tray} Tray + ${summary.butir_eceran} Butir` : '...'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-content-secondary flex items-center gap-1.5 font-medium">
                <Scale className="w-3.5 h-3.5 text-amber-600" />
                Estimasi Bobot Fisik:
              </span>
              <span className="font-mono font-bold text-amber-800">
                {summary ? `~${summary.estimasi_kg} kg` : '...'}
              </span>
            </div>
          </div>
        </Card>

        {/* Card 2: Akumulasi Panen Masuk */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Egg className="w-5 h-5" />
              </div>
              <Badge variant="success" size="sm" icon={<ArrowUpRight className="w-3 h-3" />}>
                Panen Masuk
              </Badge>
            </div>

            <p className="text-xs text-content-secondary font-bold uppercase tracking-wider">Akumulasi Telur Layak Jual</p>
            <div className="mt-1 flex items-baseline gap-2">
              <h3 className="text-3xl font-black tracking-tight text-content-primary font-mono">
                {summary ? formatNumber(summary.total_layak_jual) : '...'}
              </h3>
              <span className="text-xs text-content-secondary font-medium">Butir Masuk</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-content-secondary font-medium">Kualitas Normal:</span>
              <span className="font-mono font-bold text-emerald-700">
                {summary ? `${formatNumber(summary.total_normal)} butir` : '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-content-secondary font-medium">Kualitas Retak (Layak):</span>
              <span className="font-mono font-bold text-amber-700">
                {summary ? `${formatNumber(summary.total_retak)} butir` : '...'}
              </span>
            </div>
            <div className="text-[11px] text-content-muted pt-0.5">
              Total Panen Kotor: {summary ? formatNumber(summary.total_produksi) : '...'} butir
            </div>
          </div>
        </Card>

        {/* Card 3: Akumulasi Pengurangan */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                <TrendingDown className="w-5 h-5" />
              </div>
              <Badge variant="indigo" size="sm" icon={<ArrowDownRight className="w-3 h-3" />}>
                Aliran Keluar
              </Badge>
            </div>

            <p className="text-xs text-content-secondary font-bold uppercase tracking-wider">Akumulasi Pengurangan</p>
            <div className="mt-1 flex items-baseline gap-2">
              <h3 className="text-3xl font-black tracking-tight text-content-primary font-mono">
                {summary ? formatNumber(summary.total_terjual + summary.total_rusak) : '...'}
              </h3>
              <span className="text-xs text-content-secondary font-medium">Butir Keluar / Rusak</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-content-secondary font-medium">Terjual Komersial:</span>
              <span className="font-mono font-bold text-purple-700">
                {summary ? `${formatNumber(summary.total_terjual)} butir` : '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-content-secondary font-medium">Rusak/Pecah Panen:</span>
              <span className="font-mono font-bold text-rose-700">
                {summary ? `${formatNumber(summary.total_rusak)} butir` : '...'}
              </span>
            </div>
            <div className="text-[11px] text-content-muted pt-0.5">
              Afkir dibuang &amp; tidak masuk stok siap jual
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar Preset & Tanggal */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-xs text-content-secondary font-bold uppercase tracking-wider mr-1">
            Rentang:
          </span>
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
              className={`px-3 py-2 min-h-[44px] rounded-lg transition font-bold cursor-pointer ${datePreset === p.id
                ? 'bg-brand text-white shadow-xs'
                : 'bg-surface-muted text-content-secondary hover:text-content-primary border border-border-subtle'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Inputs if Custom */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface-page border border-border-subtle rounded-xl px-2.5 py-2 min-h-[44px] text-content-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <span className="text-content-secondary font-medium">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface-page border border-border-subtle rounded-xl px-2.5 py-2 min-h-[44px] text-content-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        )}
      </Card>

      {/* Stock Ledger Mutasi Records (Table on Desktop >= md, Card List on Mobile < md) */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-content-muted">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Memuat deret mutasi ledger...</p>
        </div>
      ) : ledgerData.items.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8 text-brand" />}
          title="Belum Ada Catatan Mutasi"
          description="Catat panen pada modul Produksi Telur atau transaksi pada Penjualan untuk mengisi mutasi ledger gudang."
        />
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (hidden on mobile < md) */}
          <div className="hidden md:block border border-border-subtle rounded-xl bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-content-primary text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand" />
                  <span>Buku Mutasi &amp; Saldo Berjalan (Stock Ledger)</span>
                </h3>
                <p className="text-xs text-content-secondary mt-0.5">
                  Aliran telur masuk (panen), telur rusak (pecah), dan telur keluar (penjualan) berurutan kronologis.
                </p>
              </div>

              {startDate && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-muted border border-border-subtle text-xs">
                  <Clock className="w-3.5 h-3.5 text-content-secondary" />
                  <span className="text-content-secondary font-medium">Saldo Awal Terbawa:</span>
                  <span className="font-mono font-bold text-content-primary">
                    {formatNumber(ledgerData.saldo_awal)} butir
                  </span>
                </div>
              )}
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-muted text-content-secondary uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4 text-right">Telur Masuk (Layak)</th>
                  <th className="py-3 px-4 text-right">Telur Rusak (Pecah)</th>
                  <th className="py-3 px-4 text-right">Telur Keluar (Terjual)</th>
                  <th className="py-3 px-4 text-right">Netto Harian</th>
                  <th className="py-3 px-4 text-right">Saldo Akhir</th>
                  <th className="py-3 px-4 text-center">Status Harian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {ledgerData.items.map((row, idx) => (
                  <tr key={`${row.tanggal}-${idx}`} className="hover:bg-slate-50 transition">
                    {/* Tanggal */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-content-primary">{formatDisplayDate(row.tanggal)}</div>
                      <div className="text-[10px] text-content-muted font-mono">{row.tanggal}</div>
                    </td>

                    {/* Telur Masuk Layak */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {row.masuk_layak > 0 ? (
                        <div>
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            +{formatNumber(row.masuk_layak)}
                          </span>
                          <div className="text-[10px] text-content-muted">
                            N: {formatNumber(row.masuk_normal)} | R: {formatNumber(row.masuk_retak)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-content-muted font-mono">-</span>
                      )}
                    </td>

                    {/* Telur Rusak (Pecah) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {row.rusak_pecah > 0 ? (
                        <span className="font-mono font-bold text-rose-700">
                          {formatNumber(row.rusak_pecah)}
                        </span>
                      ) : (
                        <span className="text-content-muted font-mono">-</span>
                      )}
                    </td>

                    {/* Telur Keluar (Terjual) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {row.keluar_terjual > 0 ? (
                        <span className="font-mono font-bold text-purple-700 text-sm">
                          -{formatNumber(row.keluar_terjual)}
                        </span>
                      ) : (
                        <span className="text-content-muted font-mono">-</span>
                      )}
                    </td>

                    {/* Perubahan Netto */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold">
                      {row.perubahan_netto > 0 ? (
                        <span className="text-emerald-700">+{formatNumber(row.perubahan_netto)}</span>
                      ) : row.perubahan_netto < 0 ? (
                        <span className="text-rose-700">{formatNumber(row.perubahan_netto)}</span>
                      ) : (
                        <span className="text-content-muted">0</span>
                      )}
                    </td>

                    {/* Saldo Akhir Gudang */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className={`font-mono font-black text-sm ${row.saldo_akhir < 0 ? 'text-rose-700' : 'text-content-primary'
                        }`}>
                        {formatNumber(row.saldo_akhir)}
                      </span>
                      <span className="text-[11px] text-content-muted ml-1 font-normal">butir</span>
                    </td>

                    {/* Status Harian */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {renderStatusBadge(row.status_harian)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD LIST VIEW (hidden on desktop >= md) */}
          <div className="md:hidden space-y-3">
            {/* Header Data Tabel Versi Mobile */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-content-primary text-sm">
                  Buku Mutasi Stok Gudang
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-muted text-content-secondary text-[11px] font-bold border border-border-subtle">
                {ledgerData.items.length} Baris
              </span>
            </div>

            {startDate && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted border border-border-subtle text-xs">
                <div className="flex items-center gap-1.5 text-content-secondary">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-medium">Saldo Awal Terbawa:</span>
                </div>
                <span className="font-mono font-bold text-content-primary">
                  {formatNumber(ledgerData.saldo_awal)} butir
                </span>
              </div>
            )}

            {/* Daftar Kartu Mutasi */}
            <div className="flex flex-col gap-3">
              {ledgerData.items.map((row, idx) => (
                <Card key={`${row.tanggal}-${idx}`} className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-border-subtle pb-2.5">
                    <div>
                      <h4 className="font-bold text-sm text-content-primary">
                        {formatDisplayDate(row.tanggal)}
                      </h4>
                      <p className="text-[11px] font-mono text-content-muted mt-0.5">{row.tanggal}</p>
                    </div>
                    {renderStatusBadge(row.status_harian)}
                  </div>

                  {/* Body Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Masuk (Layak):</span>
                      <span className="font-mono font-bold text-sm text-emerald-700">
                        +{formatNumber(row.masuk_layak)}
                      </span>
                      <div className="text-[10px] text-content-muted">
                        N: {formatNumber(row.masuk_normal)} | R: {formatNumber(row.masuk_retak)}
                      </div>
                    </div>

                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Keluar (Terjual):</span>
                      <span className="font-mono font-bold text-sm text-purple-700">
                        {row.keluar_terjual > 0 ? `-${formatNumber(row.keluar_terjual)}` : '0'}
                      </span>
                    </div>

                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Pecah / Rusak:</span>
                      <span className="font-mono font-bold text-rose-700">
                        {formatNumber(row.rusak_pecah)} butir
                      </span>
                    </div>

                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Netto Harian:</span>
                      <span className={`font-mono font-bold ${row.perubahan_netto >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                        {row.perubahan_netto >= 0 ? `+${formatNumber(row.perubahan_netto)}` : formatNumber(row.perubahan_netto)}
                      </span>
                    </div>
                  </div>

                  {/* Footer: Saldo Akhir */}
                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                    <span className="text-content-secondary font-medium">Saldo Akhir Gudang:</span>
                    <span className={`font-mono font-black text-sm ${row.saldo_akhir < 0 ? 'text-rose-700' : 'text-content-primary'
                      }`}>
                      {formatNumber(row.saldo_akhir)} butir
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default StokTelurPage
