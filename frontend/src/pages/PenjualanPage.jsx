import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  createPenjualan,
  getPenjualanList,
  getPenjualanSummary,
  updatePenjualan,
  deletePenjualan,
} from '../services/penjualanService'
import { getStokSummary } from '../services/stokService'
import {
  ShoppingCart,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  RefreshCw,
  Search,
  DollarSign,
  Package,
  Layers,
  Scale,
  UserCheck,
  TrendingUp,
  Receipt,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import {
  formatRupiah,
  formatLocalDate,
  formatDisplayDate,
  formatNumber,
} from '../utils/formatters'
import {
  Card,
  Badge,
  Modal,
  PageHeader,
  EmptyState,
} from '../components/common'

// Konfigurasi visual satuan jual (Light Theme)
export const SATUAN_CONFIG = {
  butir: {
    label: 'Butir',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    color: '#2563eb',
    step: '1',
    unitLabel: 'butir',
  },
  tray: {
    label: 'Tray (30 butir)',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    color: '#9333ea',
    step: '1',
    unitLabel: 'tray',
  },
  kg: {
    label: 'Kilogram (Kg)',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#d97706',
    step: '0.01',
    unitLabel: 'kg',
  },
}

// Helper kalkulasi preset tanggal
export function calculatePresetDates(preset) {
  const today = new Date()
  if (preset === 'today') {
    const t = formatLocalDate(today)
    return { start: t, end: t }
  } else if (preset === '7days') {
    const past7 = new Date()
    past7.setDate(today.getDate() - 6)
    return { start: formatLocalDate(past7), end: formatLocalDate(today) }
  } else if (preset === 'this_month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { start: formatLocalDate(firstDay), end: formatLocalDate(lastDay) }
  }
  return { start: '', end: '' }
}

export function PenjualanPage() {
  const defaultDates = useMemo(() => calculatePresetDates('this_month'), [])
  const [penjualanList, setPenjualanList] = useState([])
  const [summaryData, setSummaryData] = useState({
    total_pendapatan: 0,
    total_butir_terjual: 0,
    total_transaksi: 0,
    breakdown_per_satuan: {},
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [stokSummary, setStokSummary] = useState(null)

  // Filter states
  const [filterSatuan, setFilterSatuan] = useState('semua')
  const [datePreset, setDatePreset] = useState('this_month')
  const [startDate, setStartDate] = useState(defaultDates.start)
  const [endDate, setEndDate] = useState(defaultDates.end)
  const [searchPembeli, setSearchPembeli] = useState('')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form Create State
  const [createForm, setCreateForm] = useState({
    tanggal: formatLocalDate(),
    satuan_jual: 'butir',
    kuantitas: '',
    harga_satuan: '',
    pembeli: '',
    jumlah_butir_manual: '',
  })

  // Form Edit State
  const [selectedItem, setSelectedItem] = useState(null)
  const [editForm, setEditForm] = useState({
    tanggal: '',
    satuan_jual: 'butir',
    kuantitas: '',
    harga_satuan: '',
    pembeli: '',
    jumlah_butir_manual: '',
  })

  // Handle Preset Change
  const handlePresetChange = (preset) => {
    setDatePreset(preset)
    if (preset === 'all') {
      setStartDate('')
      setEndDate('')
    } else if (preset !== 'custom') {
      const { start, end } = calculatePresetDates(preset)
      setStartDate(start)
      setEndDate(end)
    }
  }

  // Load Stok Summary for inventory warning check
  const loadStok = async () => {
    try {
      const data = await getStokSummary()
      setStokSummary(data)
    } catch (err) {
      console.error('Failed to load stok summary:', err)
    }
  }

  // Load Data with Filters
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filterSatuan !== 'semua') params.satuan_jual = filterSatuan
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (searchPembeli.trim()) params.pembeli = searchPembeli.trim()

      const [listRes, summaryRes] = await Promise.all([
        getPenjualanList(params),
        getPenjualanSummary(params),
      ])

      setPenjualanList(listRes || [])
      setSummaryData(
        summaryRes || {
          total_pendapatan: 0,
          total_butir_terjual: 0,
          total_transaksi: 0,
          breakdown_per_satuan: {},
        }
      )
    } catch (err) {
      setError(err.message || 'Gagal memuat data penjualan telur.')
    } finally {
      setLoading(false)
    }
  }, [filterSatuan, startDate, endDate, searchPembeli])

  useEffect(() => {
    loadData()
    loadStok()
  }, [loadData])

  // Open Create Modal
  const openCreateModal = () => {
    setError('')
    setSuccessMsg('')
    setCreateForm({
      tanggal: formatLocalDate(),
      satuan_jual: 'butir',
      kuantitas: '',
      harga_satuan: '',
      pembeli: '',
      jumlah_butir_manual: '',
    })
    loadStok()
    setShowCreateModal(true)
  }

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const kuantitasNum = parseFloat(createForm.kuantitas)
      const hargaNum = parseFloat(createForm.harga_satuan)

      if (isNaN(kuantitasNum) || kuantitasNum <= 0) {
        throw new Error('Kuantitas penjualan harus berupa angka positif.')
      }
      if (isNaN(hargaNum) || hargaNum <= 0) {
        throw new Error('Harga satuan harus berupa angka positif.')
      }

      const payload = {
        tanggal: createForm.tanggal,
        satuan_jual: createForm.satuan_jual,
        kuantitas: kuantitasNum,
        harga_satuan: hargaNum,
        pembeli: createForm.pembeli.trim() || undefined,
      }

      if (createForm.satuan_jual === 'kg' && createForm.jumlah_butir_manual) {
        const manualButir = parseInt(createForm.jumlah_butir_manual, 10)
        if (!isNaN(manualButir) && manualButir > 0) {
          payload.jumlah_butir_manual = manualButir
        }
      }

      await createPenjualan(payload)
      setSuccessMsg('Transaksi penjualan berhasil dicatat dan stok gudang terpotong!')
      setShowCreateModal(false)
      await loadData()
      await loadStok()
    } catch (err) {
      setError(err.message || 'Gagal menyimpan transaksi penjualan.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (item) => {
    setSelectedItem(item)
    setEditForm({
      tanggal: item.tanggal,
      satuan_jual: item.satuan_jual || 'butir',
      kuantitas: item.kuantitas !== undefined && item.kuantitas !== null ? item.kuantitas : item.jumlah_butir,
      harga_satuan: item.harga_satuan,
      pembeli: item.pembeli || '',
      jumlah_butir_manual: item.jumlah_butir ? String(item.jumlah_butir) : '',
    })
    setShowEditModal(true)
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedItem) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const kuantitasNum = parseFloat(editForm.kuantitas)
      const hargaNum = parseFloat(editForm.harga_satuan)

      if (isNaN(kuantitasNum) || kuantitasNum <= 0) {
        throw new Error('Kuantitas penjualan harus berupa angka positif.')
      }
      if (isNaN(hargaNum) || hargaNum <= 0) {
        throw new Error('Harga satuan harus berupa angka positif.')
      }

      const payload = {
        tanggal: editForm.tanggal,
        satuan_jual: editForm.satuan_jual,
        kuantitas: kuantitasNum,
        harga_satuan: hargaNum,
        pembeli: editForm.pembeli.trim() || undefined,
      }

      if (editForm.satuan_jual === 'kg' && editForm.jumlah_butir_manual) {
        const manualButir = parseInt(editForm.jumlah_butir_manual, 10)
        if (!isNaN(manualButir) && manualButir > 0) {
          payload.jumlah_butir_manual = manualButir
        }
      }

      await updatePenjualan(selectedItem.id, payload)
      setSuccessMsg(`Transaksi penjualan #${selectedItem.id} berhasil diperbarui!`)
      setShowEditModal(false)
      await loadData()
      await loadStok()
    } catch (err) {
      setError(err.message || 'Gagal memperbarui transaksi penjualan.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Delete Modal
  const openDeleteModal = (item) => {
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedItem) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const res = await deletePenjualan(selectedItem.id)
      setSuccessMsg(res.message || `Transaksi #${selectedItem.id} berhasil dibatalkan.`)
      setShowDeleteModal(false)
      await loadData()
      await loadStok()
    } catch (err) {
      setError(err.message || 'Gagal menghapus transaksi penjualan.')
    } finally {
      setSubmitting(false)
    }
  }

  // Helper live preview calculations for form
  const getLivePreview = (form) => {
    const qty = parseFloat(form.kuantitas) || 0
    const price = parseFloat(form.harga_satuan) || 0
    const total = qty * price

    let butirFisik = 0
    if (form.satuan_jual === 'butir') {
      butirFisik = Math.round(qty)
    } else if (form.satuan_jual === 'tray') {
      butirFisik = Math.round(qty * 30)
    } else if (form.satuan_jual === 'kg') {
      if (form.jumlah_butir_manual && parseInt(form.jumlah_butir_manual, 10) > 0) {
        butirFisik = parseInt(form.jumlah_butir_manual, 10)
      } else {
        butirFisik = Math.round((qty * 1000) / 60)
      }
    }

    return { total, butirFisik }
  }

  const createPreview = getLivePreview(createForm)
  const editPreview = getLivePreview(editForm)

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <PageHeader
        title="Penjualan & Distribusi Telur"
        subtitle="Manajemen transaksi komersial telur (Butir, Tray, Kg), kalkulasi omzet, dan pengurangan mutasi stok fisik gudang."
        action={
          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Penjualan</span>
          </button>
        }
      />

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs shadow-xs">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Total Pendapatan Penjualan */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-content-secondary text-xs font-semibold mb-2">
            <span>Total Pendapatan</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight font-mono">
            {formatRupiah(summaryData.total_pendapatan)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-content-secondary">
            <Calendar className="w-3.5 h-3.5 text-brand" />
            <span>
              {datePreset === 'this_month'
                ? 'Bulan Ini'
                : datePreset === 'today'
                  ? 'Hari Ini'
                  : datePreset === '7days'
                    ? '7 Hari Terakhir'
                    : datePreset === 'custom'
                      ? 'Periode Kustom'
                      : 'Semua Waktu'}
            </span>
          </div>
        </Card>

        {/* KPI 2: Total Butir Fisik Terjual */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-content-secondary text-xs font-semibold mb-2">
            <span>Total Butir Terjual</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-content-primary tracking-tight font-mono">
            {formatNumber(summaryData.total_butir_terjual)}{' '}
            <span className="text-sm font-normal text-content-secondary">butir</span>
          </div>
          <div className="mt-2 text-xs text-content-muted">
            Pengurangan mutasi stok fisik gudang
          </div>
        </Card>

        {/* KPI 3: Total Transaksi & Rata-rata */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-content-secondary text-xs font-semibold mb-2">
            <span>Frekuensi Transaksi</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-content-primary tracking-tight font-mono">
            {formatNumber(summaryData.total_transaksi)}{' '}
            <span className="text-sm font-normal text-content-secondary">transaksi</span>
          </div>
          <div className="mt-2 text-xs text-content-secondary">
            Rata-rata:{' '}
            <span className="text-content-primary font-bold font-mono">
              {summaryData.total_transaksi > 0
                ? formatRupiah(summaryData.total_pendapatan / summaryData.total_transaksi)
                : 'Rp 0'}
            </span>
          </div>
        </Card>
      </div>

      {/* Subtotal per Satuan Breakdown Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {Object.entries(SATUAN_CONFIG).map(([satKey, cfg]) => {
          const nominal = summaryData.breakdown_per_satuan?.[satKey] || 0
          const isSelected = filterSatuan === satKey
          return (
            <div
              key={satKey}
              onClick={() => setFilterSatuan(isSelected ? 'semua' : satKey)}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${isSelected
                  ? 'bg-brand-light border-brand shadow-xs'
                  : 'bg-white border-border-subtle hover:border-slate-300'
                }`}
            >
              <div>
                <div className="text-content-secondary text-[11px] font-medium mb-0.5">
                  Penjualan per {cfg.label}
                </div>
                <div className="font-bold text-content-primary text-sm font-mono">
                  {formatRupiah(nominal)}
                </div>
              </div>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
            </div>
          )
        })}
      </div>

      {/* Interactive Filter Bar */}
      <Card className="p-4 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Tanggal */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-xs text-content-secondary font-bold uppercase tracking-wider mr-1">
              Rentang:
            </span>
            {[
              { id: 'this_month', label: 'Bulan Ini' },
              { id: 'today', label: 'Hari Ini' },
              { id: '7days', label: '7 Hari Terakhir' },
              { id: 'all', label: 'Semua Waktu' },
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

          {/* Date range if custom */}
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
        </div>

        {/* Filter Satuan & Search Pembeli */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border-subtle text-xs">
          <div>
            <label className="block text-content-secondary font-bold uppercase tracking-wider mb-1.5">
              Filter Jenis Satuan
            </label>
            <select
              value={filterSatuan}
              onChange={(e) => setFilterSatuan(e.target.value)}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3 py-2 min-h-[44px] text-content-primary text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="semua">Semua Satuan Jual</option>
              <option value="butir">Satuan Butir</option>
              <option value="tray">Satuan Tray (Isi 30)</option>
              <option value="kg">Satuan Kilogram (Kg)</option>
            </select>
          </div>

          <div>
            <label className="block text-content-secondary font-bold uppercase tracking-wider mb-1.5">
              Cari Pembeli / Pelanggan
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-content-muted" />
              <input
                type="text"
                placeholder="Ketik nama toko, agen, atau pembeli..."
                value={searchPembeli}
                onChange={(e) => setSearchPembeli(e.target.value)}
                className="w-full bg-surface-page border border-border-subtle rounded-xl pl-9 pr-3 py-2 min-h-[44px] text-content-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Riwayat Penjualan (Table on Desktop >= md, Card List on Mobile < md) */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-content-muted">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm font-medium">Memuat data penjualan telur...</p>
        </div>
      ) : penjualanList.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8 text-brand" />}
          title="Tidak Ada Transaksi Penjualan"
          description="Tidak ditemukan rekaman transaksi pada periode atau filter pencarian terpilih."
          action={
            <button
              onClick={openCreateModal}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Catat Penjualan Sekarang
            </button>
          }
        />
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (hidden on mobile < md) */}
          <div className="hidden md:block border border-border-subtle rounded-xl bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-content-primary text-base">Riwayat Transaksi Penjualan</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-muted text-content-secondary text-xs font-bold">
                {penjualanList.length} Transaksi
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-border-subtle text-content-secondary uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Pembeli</th>
                  <th className="py-3.5 px-4">Satuan Jual</th>
                  <th className="py-3.5 px-4 text-right">Kuantitas</th>
                  <th className="py-3.5 px-4 text-right">Harga Satuan</th>
                  <th className="py-3.5 px-4 text-right">Total Pendapatan</th>
                  <th className="py-3.5 px-4 text-center">Butir Fisik</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {penjualanList.map((item) => {
                  const cfg = SATUAN_CONFIG[item.satuan_jual] || SATUAN_CONFIG.butir
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-content-primary whitespace-nowrap">
                        {formatDisplayDate(item.tanggal)}
                      </td>
                      <td className="py-3.5 px-4 text-content-primary whitespace-nowrap font-medium">
                        {item.pembeli || <span className="text-content-muted italic">Umum / Retail</span>}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.badgeClass}`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-content-primary whitespace-nowrap">
                        {item.kuantitas !== undefined && item.kuantitas !== null ? item.kuantitas : item.jumlah_butir} {cfg.unitLabel}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-content-secondary whitespace-nowrap">
                        {formatRupiah(item.harga_satuan)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                        {formatRupiah(item.total)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-muted text-content-secondary font-mono text-xs font-semibold">
                          <Package className="w-3.5 h-3.5 text-brand" />
                          <span>{formatNumber(item.jumlah_butir)}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit transaksi"
                            className="p-1.5 rounded-lg bg-surface-muted hover:bg-slate-200 text-content-secondary hover:text-content-primary border border-border-subtle transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            title="Hapus transaksi"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD LIST VIEW (hidden on desktop >= md) */}
          <div className="md:hidden space-y-3">
            {/* Header Data Tabel Versi Mobile */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-content-primary text-sm">
                  Riwayat Transaksi Penjualan
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-muted text-content-secondary text-[11px] font-bold border border-border-subtle">
                {penjualanList.length} Transaksi
              </span>
            </div>

            {/* Daftar Kartu Transaksi */}
            <div className="flex flex-col gap-3">
              {penjualanList.map((item) => {
                const cfg = SATUAN_CONFIG[item.satuan_jual] || SATUAN_CONFIG.butir
              return (
                <Card key={item.id} className="p-4 space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-border-subtle pb-2.5">
                    <div>
                      <h4 className="font-bold text-sm text-content-primary">
                        {item.pembeli || 'Umum / Retail'}
                      </h4>
                      <p className="text-xs text-content-secondary mt-0.5">
                        {formatDisplayDate(item.tanggal)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.badgeClass}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Total Pendapatan:</span>
                      <span className="font-mono font-black text-sm text-emerald-700">
                        {formatRupiah(item.total)}
                      </span>
                    </div>
                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Kuantitas Jual:</span>
                      <span className="font-mono font-bold text-sm text-content-primary">
                        {item.kuantitas !== undefined && item.kuantitas !== null ? item.kuantitas : item.jumlah_butir} {cfg.unitLabel}
                      </span>
                    </div>
                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Harga Satuan:</span>
                      <span className="font-mono font-semibold text-content-secondary">
                        {formatRupiah(item.harga_satuan)}
                      </span>
                    </div>
                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Butir Fisik Keluar:</span>
                      <span className="font-mono font-bold text-purple-700">
                        {formatNumber(item.jumlah_butir)} butir
                      </span>
                    </div>
                  </div>

                  {/* Card Actions (min-h-[44px] touch target) */}
                  <div className="pt-2 border-t border-border-subtle grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary text-xs font-bold border border-border-subtle transition active:scale-95 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 text-brand" />
                      <span>Edit Transaksi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(item)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </Card>
              )
            })}
            </div>
          </div>
        </>
      )}

      {/* ADAPTIVE MODAL: Tambah Penjualan Baru */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Catat Penjualan Telur"
        subtitle="Input transaksi komersial penjualan dan konversi butir fisik gudang."
        icon={<ShoppingCart className="w-5 h-5 text-brand" />}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {/* Tanggal */}
          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
              Tanggal Transaksi *
            </label>
            <input
              type="date"
              required
              value={createForm.tanggal}
              onChange={(e) => setCreateForm({ ...createForm, tanggal: e.target.value })}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Satuan Jual (Segmented Buttons) */}
          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
              Satuan Komersial Jual *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(SATUAN_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setCreateForm((prev) => ({
                      ...prev,
                      satuan_jual: key,
                      jumlah_butir_manual: key === 'kg' ? prev.jumlah_butir_manual : '',
                    }))
                  }
                  className={`py-2.5 px-3 min-h-[44px] rounded-xl font-bold border text-center transition cursor-pointer ${createForm.satuan_jual === key
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : 'bg-surface-muted text-content-secondary border-border-subtle hover:border-slate-300'
                    }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kuantitas & Harga Satuan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-content-primary font-bold uppercase tracking-wider">
                  Kuantitas ({createForm.satuan_jual}) *
                </label>
                {stokSummary && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold ${stokSummary.stok_tersedia > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                  >
                    Stok: {formatNumber(stokSummary.stok_tersedia)} btr
                  </span>
                )}
              </div>
              <input
                type="number"
                inputMode={createForm.satuan_jual === 'kg' ? 'decimal' : 'numeric'}
                required
                min="0.01"
                step="any"
                placeholder="0"
                value={createForm.kuantitas}
                onChange={(e) => setCreateForm({ ...createForm, kuantitas: e.target.value })}
                className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
                Harga per {createForm.satuan_jual} (Rp) *
              </label>
              <input
                type="number"
                inputMode="numeric"
                required
                min="1"
                step="any"
                placeholder="Rp"
                value={createForm.harga_satuan}
                onChange={(e) => setCreateForm({ ...createForm, harga_satuan: e.target.value })}
                className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          {/* Opsi Override Manual Butir Fisik jika Satuan Kg */}
          {createForm.satuan_jual === 'kg' && (
            <div className="p-3.5 rounded-xl bg-surface-page border border-border-subtle">
              <label className="text-xs text-content-primary font-bold block mb-1">
                Hitung Butir Riil Timbangan <span className="text-content-muted font-normal">(Opsional)</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="Kosongkan jika pakai estimasi standar (60gr/butir)"
                value={createForm.jumlah_butir_manual}
                onChange={(e) => setCreateForm({ ...createForm, jumlah_butir_manual: e.target.value })}
                className="w-full bg-white border border-border-subtle rounded-xl px-3 py-2 min-h-[44px] text-xs text-content-primary font-mono focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          )}

          {/* Live Preview Kalkulasi Real-time */}
          <div className="p-3.5 rounded-xl bg-surface-muted border border-border-subtle space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-content-secondary font-medium flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Total Pendapatan:
              </span>
              <span className="font-mono font-black text-emerald-700 text-sm">
                {formatRupiah(createPreview.total)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-content-secondary font-medium flex items-center gap-1">
                <Package className="w-4 h-4 text-purple-600" />
                Mutasi Stok Fisik:
              </span>
              <span className="font-mono font-bold text-purple-800">
                ~{formatNumber(createPreview.butirFisik)} butir keluar
              </span>
            </div>
          </div>

          {/* Peringatan Over-Capacity jika Kuantitas Melebihi Stok Gudang */}
          {createPreview.butirFisik > 0 &&
            stokSummary &&
            createPreview.butirFisik > stokSummary.stok_tersedia && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2.5 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Perhatian Kapasitas Stok: </span>
                  Kuantitas penjualan ({formatNumber(createPreview.butirFisik)} butir) melebihi stok gudang ({formatNumber(stokSummary.stok_tersedia)} butir).
                  Transaksi tetap dapat disimpan, namun akan menyebabkan saldo stok gudang menjadi defisit.
                </div>
              </div>
            )}

          {/* Nama Pembeli */}
          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
              Nama Pembeli / Pelanggan <span className="text-content-muted font-normal">(Opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Misal: Toko Berkah Jaya / Ibu Sri"
              value={createForm.pembeli}
              onChange={(e) => setCreateForm({ ...createForm, pembeli: e.target.value })}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary font-bold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Simpan Transaksi</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ADAPTIVE MODAL: Edit Penjualan */}
      <Modal
        isOpen={showEditModal && !!selectedItem}
        onClose={() => setShowEditModal(false)}
        title={`Edit Penjualan #${selectedItem?.id || ''}`}
        subtitle="Perbarui data transaksi komersial dan penyesuaian stok gudang."
        icon={<Edit2 className="w-5 h-5 text-brand" />}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
              Tanggal Transaksi *
            </label>
            <input
              type="date"
              required
              value={editForm.tanggal}
              onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
              Satuan Jual *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(SATUAN_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setEditForm((prev) => ({
                      ...prev,
                      satuan_jual: key,
                      jumlah_butir_manual: key === 'kg' ? prev.jumlah_butir_manual : '',
                    }))
                  }
                  className={`py-2.5 px-3 min-h-[44px] rounded-xl font-bold border text-center transition cursor-pointer ${editForm.satuan_jual === key
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : 'bg-surface-muted text-content-secondary border-border-subtle hover:border-slate-300'
                    }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
                Kuantitas ({editForm.satuan_jual}) *
              </label>
              <input
                type="number"
                inputMode={editForm.satuan_jual === 'kg' ? 'decimal' : 'numeric'}
                required
                min="0.01"
                step={SATUAN_CONFIG[editForm.satuan_jual]?.step || '1'}
                value={editForm.kuantitas}
                onChange={(e) => setEditForm({ ...editForm, kuantitas: e.target.value })}
                className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
                Harga per {editForm.satuan_jual} (Rp) *
              </label>
              <input
                type="number"
                inputMode="numeric"
                required
                min="1"
                step="100"
                value={editForm.harga_satuan}
                onChange={(e) => setEditForm({ ...editForm, harga_satuan: e.target.value })}
                className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-muted border border-border-subtle space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-content-secondary font-medium">Total Baru:</span>
              <span className="font-mono font-black text-emerald-700 text-sm">
                {formatRupiah(editPreview.total)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-content-secondary font-medium">Butir Fisik:</span>
              <span className="font-mono font-bold text-purple-800">
                ~{formatNumber(editPreview.butirFisik)} butir keluar
              </span>
            </div>
          </div>

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
              Nama Pembeli
            </label>
            <input
              type="text"
              value={editForm.pembeli}
              onChange={(e) => setEditForm({ ...editForm, pembeli: e.target.value })}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary font-bold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Perbarui</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ADAPTIVE MODAL: Konfirmasi Hapus */}
      <Modal
        isOpen={showDeleteModal && !!selectedItem}
        onClose={() => setShowDeleteModal(false)}
        title="Hapus Transaksi Penjualan"
        subtitle="Konfirmasi pembatalan transaksi komersial."
        icon={<Trash2 className="w-5 h-5 text-rose-600" />}
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 mb-5">
          <p className="text-xs text-content-secondary">
            Tindakan ini permanen. Catatan transaksi akan dihapus dan kuantitas butir fisik akan dikembalikan ke saldo stok gudang.
          </p>
          <div className="p-3.5 rounded-xl bg-surface-page border border-border-subtle space-y-2 text-xs">
            <div className="flex justify-between text-content-secondary">
              <span>Tanggal:</span>
              <span className="text-content-primary font-bold">
                {selectedItem ? formatDisplayDate(selectedItem.tanggal) : ''}
              </span>
            </div>
            <div className="flex justify-between text-content-secondary">
              <span>Pembeli:</span>
              <span className="text-content-primary font-bold">{selectedItem?.pembeli || 'Umum'}</span>
            </div>
            <div className="flex justify-between text-content-secondary">
              <span>Total:</span>
              <span className="text-emerald-700 font-mono font-black">
                {selectedItem ? formatRupiah(selectedItem.total) : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={() => setShowDeleteModal(false)}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary font-bold text-xs transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleDeleteConfirm}
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Ya, Hapus</span>
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default PenjualanPage
