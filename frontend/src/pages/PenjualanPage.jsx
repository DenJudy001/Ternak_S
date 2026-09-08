import React, { useState, useEffect, useMemo } from 'react'
import {
  createPenjualan,
  getPenjualanList,
  getPenjualanSummary,
  updatePenjualan,
  deletePenjualan,
} from '../services/penjualanService'
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
} from 'lucide-react'

// Konfigurasi visual satuan jual
export const SATUAN_CONFIG = {
  butir: {
    label: 'Butir',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    color: '#3b82f6',
    step: '1',
    unitLabel: 'butir',
  },
  tray: {
    label: 'Tray (30 butir)',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    color: '#a855f7',
    step: '1',
    unitLabel: 'tray',
  },
  kg: {
    label: 'Kilogram (Kg)',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    color: '#f59e0b',
    step: '0.01',
    unitLabel: 'kg',
  },
}

// Helper universal format Rupiah
export function formatRupiah(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Helper format tanggal lokal tanpa UTC drift (YYYY-MM-DD)
export function formatLocalDate(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper format display tanggal Indonesia
export function formatDisplayDate(dateString) {
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

export function PenjualanPage() {
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

  // Filter states
  const [filterSatuan, setFilterSatuan] = useState('semua')
  const [datePreset, setDatePreset] = useState('this_month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
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

  // Helper kalkulasi preset tanggal
  const calculatePresetDates = (preset) => {
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

  const handlePresetChange = (preset) => {
    setDatePreset(preset)
    if (preset !== 'custom') {
      const { start, end } = calculatePresetDates(preset)
      setStartDate(start)
      setEndDate(end)
    }
  }

  // Set default filter date
  useEffect(() => {
    const { start, end } = calculatePresetDates('this_month')
    setStartDate(start)
    setEndDate(end)
  }, [])

  // Fetch Penjualan List & Summary
  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filterSatuan !== 'semua') params.satuan_jual = filterSatuan
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      if (searchPembeli.trim()) params.search_pembeli = searchPembeli.trim()

      const [listRes, summaryRes] = await Promise.all([
        getPenjualanList({ ...params, limit: 200 }),
        getPenjualanSummary({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
      ])

      setPenjualanList(listRes || [])
      setSummaryData(summaryRes || {
        total_pendapatan: 0,
        total_butir_terjual: 0,
        total_transaksi: 0,
        breakdown_per_satuan: {},
      })
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err.message || 'Gagal memuat data penjualan telur.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (datePreset === 'custom' && (!startDate || !endDate)) {
      return
    }
    fetchData()
  }, [filterSatuan, startDate, endDate, datePreset, searchPembeli])

  // Live conversion calculator for Create Form
  const createPreview = useMemo(() => {
    const q = parseFloat(createForm.kuantitas) || 0
    const h = parseFloat(createForm.harga_satuan) || 0
    const total = roundTwo(q * h)

    let butirFisik = 0
    if (createForm.jumlah_butir_manual && parseInt(createForm.jumlah_butir_manual, 10) > 0) {
      butirFisik = parseInt(createForm.jumlah_butir_manual, 10)
    } else if (createForm.satuan_jual === 'butir') {
      butirFisik = Math.floor(q)
    } else if (createForm.satuan_jual === 'tray') {
      butirFisik = Math.round(q * 30)
    } else if (createForm.satuan_jual === 'kg') {
      butirFisik = Math.round(q / 0.06)
    }

    return { total, butirFisik }
  }, [createForm])

  // Live conversion calculator for Edit Form
  const editPreview = useMemo(() => {
    const q = parseFloat(editForm.kuantitas) || 0
    const h = parseFloat(editForm.harga_satuan) || 0
    const total = roundTwo(q * h)

    let butirFisik = 0
    if (editForm.jumlah_butir_manual && parseInt(editForm.jumlah_butir_manual, 10) > 0) {
      butirFisik = parseInt(editForm.jumlah_butir_manual, 10)
    } else if (editForm.satuan_jual === 'butir') {
      butirFisik = Math.floor(q)
    } else if (editForm.satuan_jual === 'tray') {
      butirFisik = Math.round(q * 30)
    } else if (editForm.satuan_jual === 'kg') {
      butirFisik = Math.round(q / 0.06)
    }

    return { total, butirFisik }
  }, [editForm])

  function roundTwo(val) {
    return Math.round(val * 100) / 100
  }

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const q = parseFloat(createForm.kuantitas)
      const h = parseFloat(createForm.harga_satuan)
      if (isNaN(q) || q <= 0) throw new Error('Kuantitas penjualan harus lebih besar dari 0.')
      if (isNaN(h) || h <= 0) throw new Error('Harga satuan harus lebih besar dari 0.')

      const payload = {
        tanggal: createForm.tanggal,
        satuan_jual: createForm.satuan_jual,
        kuantitas: q,
        harga_satuan: h,
        pembeli: createForm.pembeli ? createForm.pembeli.trim() : null,
        jumlah_butir_manual: createForm.jumlah_butir_manual
          ? parseInt(createForm.jumlah_butir_manual, 10)
          : null,
      }

      await createPenjualan(payload)
      setSuccessMsg('Transaksi penjualan telur berhasil dicatat.')
      setShowCreateModal(false)
      setCreateForm({
        tanggal: formatLocalDate(),
        satuan_jual: 'butir',
        kuantitas: '',
        harga_satuan: '',
        pembeli: '',
        jumlah_butir_manual: '',
      })
      await fetchData()
    } catch (err) {
      setError(err.message || 'Gagal mencatat penjualan.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (item) => {
    setSelectedItem(item)
    setEditForm({
      tanggal: item.tanggal,
      satuan_jual: item.satuan_jual,
      kuantitas: item.kuantitas !== undefined && item.kuantitas !== null ? String(item.kuantitas) : String(item.jumlah_butir),
      harga_satuan: item.harga_satuan ? String(item.harga_satuan) : '',
      pembeli: item.pembeli || '',
      jumlah_butir_manual: '',
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
      const q = parseFloat(editForm.kuantitas)
      const h = parseFloat(editForm.harga_satuan)
      if (isNaN(q) || q <= 0) throw new Error('Kuantitas penjualan harus lebih besar dari 0.')
      if (isNaN(h) || h <= 0) throw new Error('Harga satuan harus lebih besar dari 0.')

      const payload = {
        tanggal: editForm.tanggal,
        satuan_jual: editForm.satuan_jual,
        kuantitas: q,
        harga_satuan: h,
        pembeli: editForm.pembeli ? editForm.pembeli.trim() : null,
        jumlah_butir_manual: editForm.jumlah_butir_manual
          ? parseInt(editForm.jumlah_butir_manual, 10)
          : null,
      }

      await updatePenjualan(selectedItem.id, payload)
      setSuccessMsg(`Transaksi penjualan #${selectedItem.id} berhasil diperbarui.`)
      setShowEditModal(false)
      setSelectedItem(null)
      await fetchData()
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
      await deletePenjualan(selectedItem.id)
      setSuccessMsg(`Transaksi penjualan #${selectedItem.id} berhasil dihapus.`)
      setShowDeleteModal(false)
      setSelectedItem(null)
      await fetchData()
    } catch (err) {
      setError(err.message || 'Gagal menghapus transaksi penjualan.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Penjualan Telur</h2>
          </div>
          <p className="text-sm text-slate-400">
            Pencatatan transaksi komersial telur (butir, tray, kg) dan normalisasi mutasi fisik stok gudang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Refresh data"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Penjualan</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Total Pendapatan */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Total Pendapatan</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatRupiah(summaryData.total_pendapatan)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
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
        </div>

        {/* KPI 2: Total Butir Fisik Terjual */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Total Butir Terjual</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summaryData.total_butir_terjual.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-400">butir</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Pengurangan mutasi stok fisik telur gudang
          </div>
        </div>

        {/* KPI 3: Total Transaksi & Rata-rata */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Frekuensi Transaksi</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summaryData.total_transaksi} <span className="text-sm font-normal text-slate-400">transaksi</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Rata-rata:{' '}
            <span className="text-slate-200 font-semibold">
              {summaryData.total_transaksi > 0
                ? formatRupiah(summaryData.total_pendapatan / summaryData.total_transaksi)
                : 'Rp 0'}
            </span>
          </div>
        </div>
      </div>

      {/* Subtotal per Satuan Breakdown Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {Object.entries(SATUAN_CONFIG).map(([satKey, cfg]) => {
          const nominal = summaryData.breakdown_per_satuan?.[satKey] || 0
          return (
            <div
              key={satKey}
              onClick={() => setFilterSatuan(filterSatuan === satKey ? 'semua' : satKey)}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${filterSatuan === satKey
                  ? 'bg-slate-800 border-purple-500/50 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
            >
              <div>
                <div className="text-slate-400 text-[11px] mb-0.5">Penjualan per {cfg.label}</div>
                <div className="font-bold text-white text-sm">{formatRupiah(nominal)}</div>
              </div>
              <span className={`w-3 h-3 rounded-full`} style={{ backgroundColor: cfg.color }} />
            </div>
          )
        })}
      </div>

      {/* Interactive Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Preset Tanggal */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 text-xs">
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
                className={`px-3 py-1.5 rounded-lg transition font-medium ${datePreset === p.id
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
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
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-slate-500">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          )}
        </div>

        {/* Filter Satuan & Search Pembeli */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-xs">
          {/* Satuan Jual Dropdown */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Filter Jenis Satuan</label>
            <select
              value={filterSatuan}
              onChange={(e) => setFilterSatuan(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="semua">Semua Satuan Jual</option>
              <option value="butir">Satuan Butir</option>
              <option value="tray">Satuan Tray (Isi 30)</option>
              <option value="kg">Satuan Kilogram (Kg)</option>
            </select>
          </div>

          {/* Search Pembeli */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Cari Pembeli / Pelanggan</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Ketik nama toko, agen, atau pembeli..."
                value={searchPembeli}
                onChange={(e) => setSearchPembeli(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Riwayat Penjualan */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base">Riwayat Transaksi Penjualan</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold">
              {penjualanList.length} Transaksi
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
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
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                    Memuat data penjualan...
                  </td>
                </tr>
              ) : penjualanList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
                    Tidak ada transaksi penjualan pada periode atau filter terpilih.
                  </td>
                </tr>
              ) : (
                penjualanList.map((item) => {
                  const cfg = SATUAN_CONFIG[item.satuan_jual] || SATUAN_CONFIG.butir
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition">
                      {/* Tanggal */}
                      <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                        {formatDisplayDate(item.tanggal)}
                      </td>

                      {/* Pembeli */}
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap font-medium">
                        {item.pembeli || <span className="text-slate-600 italic">Umum / Retail</span>}
                      </td>

                      {/* Satuan Jual */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.badgeClass}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Kuantitas */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-200 whitespace-nowrap">
                        {item.kuantitas !== undefined && item.kuantitas !== null ? item.kuantitas : item.jumlah_butir} {cfg.unitLabel}
                      </td>

                      {/* Harga Satuan */}
                      <td className="py-3 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                        {formatRupiah(item.harga_satuan)}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {formatRupiah(item.total)}
                      </td>

                      {/* Butir Fisik Keluar */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-xs">
                          <Package className="w-3 h-3 text-purple-400" />
                          <span>{item.jumlah_butir.toLocaleString('id-ID')}</span>
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit transaksi"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            title="Hapus transaksi"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Penjualan Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">Catat Penjualan Telur</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              {/* Tanggal */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={createForm.tanggal}
                  onChange={(e) => setCreateForm({ ...createForm, tanggal: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Satuan Jual (Segmented Buttons) */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Satuan Komersial Jual</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(SATUAN_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, satuan_jual: key })}
                      className={`py-2 px-3 rounded-xl font-medium border text-center transition ${createForm.satuan_jual === key
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kuantitas & Harga Satuan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Kuantitas ({createForm.satuan_jual})
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step={SATUAN_CONFIG[createForm.satuan_jual]?.step || '1'}
                    placeholder="0"
                    value={createForm.kuantitas}
                    onChange={(e) => setCreateForm({ ...createForm, kuantitas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Harga per {createForm.satuan_jual} (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="Rp"
                    value={createForm.harga_satuan}
                    onChange={(e) => setCreateForm({ ...createForm, harga_satuan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Opsi Override Manual Butir Fisik jika Satuan Kg */}
              {createForm.satuan_jual === 'kg' && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400 font-medium">
                      Hitung Butir Riil Timbangan <span className="text-slate-500">(Opsional)</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Kosongkan jika pakai estimasi standar (60gr/butir)"
                    value={createForm.jumlah_butir_manual}
                    onChange={(e) => setCreateForm({ ...createForm, jumlah_butir_manual: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {/* Live Preview Kalkulasi Real-time */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/30 to-slate-950 border border-purple-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    Total Pendapatan:
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {formatRupiah(createPreview.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-purple-400" />
                    Mutasi Stok Fisik:
                  </span>
                  <span className="font-mono font-semibold text-purple-300">
                    ~{createPreview.butirFisik.toLocaleString('id-ID')} butir keluar
                  </span>
                </div>
              </div>

              {/* Nama Pembeli */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Nama Pembeli / Pelanggan <span className="text-slate-500 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Misal: Toko Berkah Jaya / Ibu Sri"
                  value={createForm.pembeli}
                  onChange={(e) => setCreateForm({ ...createForm, pembeli: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Transaksi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Penjualan */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">Edit Penjualan #{selectedItem.id}</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              {/* Tanggal */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={editForm.tanggal}
                  onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Satuan Jual */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Satuan Jual</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(SATUAN_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, satuan_jual: key })}
                      className={`py-2 px-3 rounded-xl font-medium border text-center transition ${editForm.satuan_jual === key
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kuantitas & Harga */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Kuantitas ({editForm.satuan_jual})
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step={SATUAN_CONFIG[editForm.satuan_jual]?.step || '1'}
                    value={editForm.kuantitas}
                    onChange={(e) => setEditForm({ ...editForm, kuantitas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Harga per {editForm.satuan_jual} (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="100"
                    value={editForm.harga_satuan}
                    onChange={(e) => setEditForm({ ...editForm, harga_satuan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Baru:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatRupiah(editPreview.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Butir Fisik:</span>
                  <span className="font-mono font-semibold text-purple-300">
                    ~{editPreview.butirFisik.toLocaleString('id-ID')} butir
                  </span>
                </div>
              </div>

              {/* Pembeli */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Nama Pembeli</label>
                <input
                  type="text"
                  value={editForm.pembeli}
                  onChange={(e) => setEditForm({ ...editForm, pembeli: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Perbarui</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 text-xs">
            <div className="flex items-center gap-3 mb-4 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Hapus Penjualan?</h4>
                <p className="text-slate-400">Tindakan ini permanen dan menghapus catatan transaksi.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 mb-5">
              <div className="flex justify-between text-slate-400">
                <span>Tanggal:</span>
                <span className="text-white font-medium">{formatDisplayDate(selectedItem.tanggal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pembeli:</span>
                <span className="text-white font-medium">{selectedItem.pembeli || 'Umum'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total:</span>
                <span className="text-emerald-400 font-mono font-bold">{formatRupiah(selectedItem.total)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
