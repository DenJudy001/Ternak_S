import React, { useState, useEffect, useMemo } from 'react'
import { getKandangList } from '../services/kandangService'
import {
  createPengeluaran,
  getPengeluaranList,
  getPengeluaranSummary,
  updatePengeluaran,
  deletePengeluaran,
} from '../services/pengeluaranService'
import {
  Receipt,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  RefreshCw,
  Layers,
  Filter,
  DollarSign,
  PieChart,
  Home,
  Tag,
  FileText,
  Clock,
  ArrowUpRight,
  TrendingDown,
  Building2,
} from 'lucide-react'

export const KATEGORI_CONFIG = {
  pakan: {
    label: 'Pakan',
    desc: 'Konsentrat, jagung, bekatul',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    color: '#3b82f6',
  },
  obat_vaksin: {
    label: 'Obat & Vaksin',
    desc: 'Vitamin, vaksin, antibiotik',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    color: '#a855f7',
  },
  operasional: {
    label: 'Operasional',
    desc: 'Listrik, air, sekam, gas',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    color: '#f59e0b',
  },
  gaji: {
    label: 'Gaji & Upah',
    desc: 'Upah anak kandang & pekerja',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    color: '#10b981',
  },
  peralatan: {
    label: 'Peralatan',
    desc: 'Tempat pakan/minum, egg tray',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    color: '#f97316',
  },
  lain_lain: {
    label: 'Lain-lain',
    desc: 'Biaya tak terduga lainnya',
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    color: '#94a3b8',
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

// Helper tampilan tanggal Indonesia (DD MMM YYYY)
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

export function PengeluaranPage() {
  const [pengeluaranList, setPengeluaranList] = useState([])
  const [summaryData, setSummaryData] = useState({ total_pengeluaran: 0, breakdown_per_kategori: {} })
  const [kandangList, setKandangList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filter states
  const [filterKategori, setFilterKategori] = useState('semua')
  const [filterAlokasi, setFilterAlokasi] = useState('semua') // 'semua' | '0' (umum) | kandang_id
  const [datePreset, setDatePreset] = useState('this_month') // 'all' | 'today' | 'this_month' | '30days' | 'custom'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form Create State
  const [createForm, setCreateForm] = useState({
    tanggal: formatLocalDate(),
    kategori: 'pakan',
    nominal: '',
    keterangan: '',
    kandang_id: '', // '' = umum peternakan
  })

  // Form Edit State
  const [selectedItem, setSelectedItem] = useState(null)
  const [editForm, setEditForm] = useState({
    tanggal: '',
    kategori: 'pakan',
    nominal: '',
    keterangan: '',
    kandang_id: '',
  })

  // Helper tanggal preset
  const calculatePresetDates = (preset) => {
    const today = new Date()
    if (preset === 'today') {
      const t = formatLocalDate(today)
      return { start: t, end: t }
    } else if (preset === '30days') {
      const past30 = new Date()
      past30.setDate(today.getDate() - 29)
      return { start: formatLocalDate(past30), end: formatLocalDate(today) }
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: formatLocalDate(firstDay), end: formatLocalDate(lastDay) }
    }
    return { start: '', end: '' }
  }

  // Handle pergantian preset tanggal
  const handlePresetChange = (preset) => {
    setDatePreset(preset)
    if (preset !== 'custom') {
      const { start, end } = calculatePresetDates(preset)
      setStartDate(start)
      setEndDate(end)
    }
  }

  // Load Kandang List for dropdowns
  useEffect(() => {
    getKandangList()
      .then((data) => {
        setKandangList(data || [])
      })
      .catch((err) => {
        console.error('Gagal memuat daftar kandang:', err)
      })
  }, [])

  // Inisialisasi default rentang tanggal saat mount
  useEffect(() => {
    const { start, end } = calculatePresetDates('this_month')
    setStartDate(start)
    setEndDate(end)
  }, [])

  // Fetch Pengeluaran List & Summary
  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filterKategori !== 'semua') {
        params.kategori = filterKategori
      }
      if (filterAlokasi !== 'semua') {
        params.kandang_id = filterAlokasi
      }
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate

      // Panggilan paralel untuk list dan summary
      const [listRes, summaryRes] = await Promise.all([
        getPengeluaranList({ ...params, limit: 200 }),
        getPengeluaranSummary({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          kandang_id: filterAlokasi !== 'semua' ? filterAlokasi : undefined,
        }),
      ])

      setPengeluaranList(listRes || [])
      setSummaryData(summaryRes || { total_pengeluaran: 0, breakdown_per_kategori: {} })
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err.message || 'Gagal memuat data pengeluaran.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only trigger fetch if not in custom without dates
    if (datePreset === 'custom' && (!startDate || !endDate)) {
      return
    }
    fetchData()
  }, [filterKategori, filterAlokasi, startDate, endDate, datePreset])

  // Hitung KPI kategori terbesar
  const topCategoryInfo = useMemo(() => {
    const breakdown = summaryData.breakdown_per_kategori || {}
    let topKat = null
    let maxNominal = 0

    Object.entries(breakdown).forEach(([kat, nominal]) => {
      if (nominal > maxNominal) {
        maxNominal = nominal
        topKat = kat
      }
    })

    const total = summaryData.total_pengeluaran || 0
    const percentage = total > 0 && maxNominal > 0 ? ((maxNominal / total) * 100).toFixed(1) : 0

    return {
      kategori: topKat ? KATEGORI_CONFIG[topKat]?.label || topKat : 'Belum Ada',
      nominal: maxNominal,
      percentage,
      badgeClass: topKat ? KATEGORI_CONFIG[topKat]?.badgeClass : 'bg-slate-800 text-slate-400',
    }
  }, [summaryData])

  // Submit Handler: Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const numNominal = parseFloat(createForm.nominal)
      if (isNaN(numNominal) || numNominal <= 0) {
        throw new Error('Nominal pengeluaran harus berupa angka lebih besar dari 0.')
      }

      const payload = {
        tanggal: createForm.tanggal,
        kategori: createForm.kategori,
        nominal: numNominal,
        keterangan: createForm.keterangan ? createForm.keterangan.trim() : null,
        kandang_id: createForm.kandang_id ? parseInt(createForm.kandang_id, 10) : null,
      }

      await createPengeluaran(payload)
      setSuccessMsg('Pengeluaran berhasil dicatat.')
      setShowCreateModal(false)
      setCreateForm({
        tanggal: formatLocalDate(),
        kategori: 'pakan',
        nominal: '',
        keterangan: '',
        kandang_id: '',
      })
      await fetchData()
    } catch (err) {
      setError(err.message || 'Gagal menyimpan pengeluaran.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (item) => {
    setSelectedItem(item)
    setEditForm({
      tanggal: item.tanggal,
      kategori: item.kategori,
      nominal: item.nominal ? String(item.nominal) : '',
      keterangan: item.keterangan || '',
      kandang_id: item.kandang_id !== null && item.kandang_id !== undefined ? String(item.kandang_id) : '',
    })
    setShowEditModal(true)
  }

  // Submit Handler: Update
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedItem) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const numNominal = parseFloat(editForm.nominal)
      if (isNaN(numNominal) || numNominal <= 0) {
        throw new Error('Nominal pengeluaran harus berupa angka lebih besar dari 0.')
      }

      const payload = {
        tanggal: editForm.tanggal,
        kategori: editForm.kategori,
        nominal: numNominal,
        keterangan: editForm.keterangan ? editForm.keterangan.trim() : null,
        kandang_id: editForm.kandang_id ? parseInt(editForm.kandang_id, 10) : null,
      }

      await updatePengeluaran(selectedItem.id, payload)
      setSuccessMsg('Data pengeluaran berhasil diperbarui.')
      setShowEditModal(false)
      setSelectedItem(null)
      await fetchData()
    } catch (err) {
      setError(err.message || 'Gagal memperbarui pengeluaran.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Delete Confirmation
  const openDeleteModal = (item) => {
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  // Submit Handler: Delete
  const handleDeleteConfirm = async () => {
    if (!selectedItem) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      await deletePengeluaran(selectedItem.id)
      setSuccessMsg(`Entri pengeluaran #${selectedItem.id} berhasil dihapus.`)
      setShowDeleteModal(false)
      setSelectedItem(null)
      await fetchData()
    } catch (err) {
      setError(err.message || 'Gagal menghapus pengeluaran.')
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
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Receipt className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Biaya & Pengeluaran</h2>
          </div>
          <p className="text-sm text-slate-400">
            Pencatatan dan pemantauan pengeluaran operasional peternakan dengan alokasi biaya langsung vs biaya umum.
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran</span>
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

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pengeluaran */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatRupiah(summaryData.total_pengeluaran)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {datePreset === 'this_month'
                ? 'Bulan Ini'
                : datePreset === 'today'
                ? 'Hari Ini'
                : datePreset === '30days'
                ? '30 Hari Terakhir'
                : datePreset === 'custom'
                ? 'Periode Kustom'
                : 'Semua Riwayat'}
            </span>
          </div>
        </div>

        {/* Card 2: Kategori Terbesar */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Kategori Terbesar</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-2">
            <span>{topCategoryInfo.kategori}</span>
            {topCategoryInfo.percentage > 0 && (
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                {topCategoryInfo.percentage}%
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Nominal: <span className="text-slate-200 font-semibold">{formatRupiah(topCategoryInfo.nominal)}</span>
          </div>
        </div>

        {/* Card 3: Total Transaksi */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Catatan Transaksi</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {pengeluaranList.length} <span className="text-sm font-normal text-slate-400">entri</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Rata-rata: <span className="text-slate-200 font-semibold">
              {pengeluaranList.length > 0
                ? formatRupiah(summaryData.total_pengeluaran / pengeluaranList.length)
                : 'Rp 0'}
            </span>
          </div>
        </div>

        {/* Card 4: Filter Alokasi Aktif */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Cakupan Alokasi</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-white tracking-tight truncate">
            {filterAlokasi === 'semua'
              ? 'Seluruh Peternakan'
              : filterAlokasi === '0'
              ? 'Biaya Umum Saja'
              : kandangList.find((k) => String(k.id) === String(filterAlokasi))?.nama_kandang || 'Kandang'}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Tersinkronisasi dengan database</span>
          </div>
        </div>
      </div>

      {/* Interactive Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Preset Tanggal Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 text-xs">
            {[
              { id: 'this_month', label: 'Bulan Ini' },
              { id: 'today', label: 'Hari Ini' },
              { id: '30days', label: '30 Hari Terakhir' },
              { id: 'all', label: 'Semua Waktu' },
              { id: 'custom', label: 'Kustom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  datePreset === p.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range inputs if custom */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-500">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Dropdowns Filter: Kategori & Alokasi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-xs">
          {/* Filter Kategori */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Filter Kategori</label>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="semua">Semua Kategori</option>
              {Object.entries(KATEGORI_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label} ({cfg.desc})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Alokasi Kandang */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Filter Alokasi Biaya</label>
            <select
              value={filterAlokasi}
              onChange={(e) => setFilterAlokasi(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="semua">Semua Alokasi (Umum + Spesifik Kandang)</option>
              <option value="0">Biaya Umum Peternakan Saja (Shared Overhead)</option>
              {kandangList.map((k) => (
                <option key={k.id} value={k.id}>
                  Kandang: {k.nama_kandang}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Category Breakdown Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        {Object.entries(KATEGORI_CONFIG).map(([katKey, cfg]) => {
          const nominal = summaryData.breakdown_per_kategori?.[katKey] || 0
          return (
            <div
              key={katKey}
              onClick={() => setFilterKategori(filterKategori === katKey ? 'semua' : katKey)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                filterKategori === katKey
                  ? 'bg-slate-800 border-emerald-500/50 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">{cfg.label}</span>
                <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: cfg.color }} />
              </div>
              <div className="font-bold text-white truncate">{formatRupiah(nominal)}</div>
            </div>
          )
        })}
      </div>

      {/* Tabel Riwayat Pengeluaran */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base">Riwayat Transaksi Pengeluaran</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold">
              {pengeluaranList.length} Baris
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Alokasi</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 text-right">Nominal</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    Memuat data transaksi...
                  </td>
                </tr>
              ) : pengeluaranList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
                    Tidak ada transaksi pengeluaran pada periode atau filter terpilih.
                  </td>
                </tr>
              ) : (
                pengeluaranList.map((item) => {
                  const cfg = KATEGORI_CONFIG[item.kategori] || KATEGORI_CONFIG.lain_lain
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition">
                      {/* Tanggal */}
                      <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                        {formatDisplayDate(item.tanggal)}
                      </td>

                      {/* Kategori Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.badgeClass}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Alokasi */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.kandang_id ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            <Home className="w-3 h-3" />
                            <span>{item.nama_kandang || `Kandang #${item.kandang_id}`}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>Biaya Umum Peternakan</span>
                          </span>
                        )}
                      </td>

                      {/* Keterangan */}
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                        {item.keterangan || <span className="text-slate-600 italic">-</span>}
                      </td>

                      {/* Nominal */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                        {formatRupiah(item.nominal)}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit pengeluaran"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            title="Hapus pengeluaran"
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

      {/* Modal: Tambah Pengeluaran Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">Catat Pengeluaran Baru</h3>
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
                <label className="block text-slate-400 font-medium mb-1">Tanggal</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={createForm.tanggal}
                    onChange={(e) => setCreateForm({ ...createForm, tanggal: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Kategori Pengeluaran</label>
                <select
                  required
                  value={createForm.kategori}
                  onChange={(e) => setCreateForm({ ...createForm, kategori: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  {Object.entries(KATEGORI_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label} - {cfg.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Nominal (Rupiah)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold">Rp</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="0"
                    value={createForm.nominal}
                    onChange={(e) => setCreateForm({ ...createForm, nominal: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {createForm.nominal && !isNaN(parseFloat(createForm.nominal)) && (
                  <p className="mt-1 text-[11px] text-emerald-400 font-mono">
                    Format: {formatRupiah(parseFloat(createForm.nominal))}
                  </p>
                )}
              </div>

              {/* Alokasi Kandang (Opsional) */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Alokasi Kandang <span className="text-slate-500 font-normal">(Opsional)</span>
                </label>
                <select
                  value={createForm.kandang_id}
                  onChange={(e) => setCreateForm({ ...createForm, kandang_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Biaya Umum Peternakan (Overhead / Seluruh Kandang)</option>
                  {kandangList.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kandang {k.nama_kandang} (Populasi: {k.jumlah_saat_ini} ekor)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-500">
                  Pilih kandang jika biaya langsung (direct cost). Kosongkan untuk biaya bersama (shared overhead).
                </p>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Catatan / Keterangan <span className="text-slate-500 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows="2"
                  placeholder="Misal: Pembelian pakan konsentrat 10 sak dari Toko Unggas Sejahtera"
                  value={createForm.keterangan}
                  onChange={(e) => setCreateForm({ ...createForm, keterangan: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Pengeluaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Pengeluaran */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">Edit Pengeluaran #{selectedItem.id}</h3>
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Kategori</label>
                <select
                  required
                  value={editForm.kategori}
                  onChange={(e) => setEditForm({ ...editForm, kategori: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  {Object.entries(KATEGORI_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label} - {cfg.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Nominal (Rupiah)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold">Rp</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={editForm.nominal}
                    onChange={(e) => setEditForm({ ...editForm, nominal: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {editForm.nominal && !isNaN(parseFloat(editForm.nominal)) && (
                  <p className="mt-1 text-[11px] text-emerald-400 font-mono">
                    Format: {formatRupiah(parseFloat(editForm.nominal))}
                  </p>
                )}
              </div>

              {/* Alokasi Kandang */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Alokasi Kandang</label>
                <select
                  value={editForm.kandang_id}
                  onChange={(e) => setEditForm({ ...editForm, kandang_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Biaya Umum Peternakan (Overhead / Seluruh Kandang)</option>
                  {kandangList.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kandang {k.nama_kandang}
                    </option>
                  ))}
                </select>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Keterangan</label>
                <textarea
                  rows="2"
                  value={editForm.keterangan}
                  onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition disabled:opacity-50"
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
                <h4 className="text-base font-bold text-white">Hapus Pengeluaran?</h4>
                <p className="text-slate-400">Tindakan ini permanen dan tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 mb-5">
              <div className="flex justify-between text-slate-400">
                <span>Tanggal:</span>
                <span className="text-white font-medium">{formatDisplayDate(selectedItem.tanggal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Kategori:</span>
                <span className="text-white font-medium capitalize">
                  {KATEGORI_CONFIG[selectedItem.kategori]?.label || selectedItem.kategori}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Nominal:</span>
                <span className="text-rose-400 font-mono font-bold">{formatRupiah(selectedItem.nominal)}</span>
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
