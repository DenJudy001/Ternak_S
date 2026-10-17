import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  TrendingDown,
  Building2,
} from 'lucide-react'
import {
  formatRupiah,
  formatLocalDate,
  formatDisplayDate,
  formatNumber,
  formatWeight,
} from '../utils/formatters'
import {
  Card,
  Badge,
  Modal,
  PageHeader,
  EmptyState,
} from '../components/common'

export const KATEGORI_CONFIG = {
  pakan: {
    label: 'Pakan',
    desc: 'Konsentrat, jagung, bekatul',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    color: '#2563eb',
  },
  obat_vaksin: {
    label: 'Obat & Vaksin',
    desc: 'Vitamin, vaksin, antibiotik',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    color: '#9333ea',
  },
  operasional: {
    label: 'Operasional',
    desc: 'Listrik, air, sekam, gas',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#d97706',
  },
  gaji: {
    label: 'Gaji & Upah',
    desc: 'Upah anak kandang & pekerja',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: '#059669',
  },
  peralatan: {
    label: 'Peralatan',
    desc: 'Tempat pakan/minum, egg tray',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    color: '#ea580c',
  },
  lain_lain: {
    label: 'Lain-lain',
    desc: 'Biaya tak terduga lainnya',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    color: '#64748b',
  },
}

// Helper tanggal preset
export function calculatePresetDates(preset) {
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

export function PengeluaranPage() {
  const defaultDates = useMemo(() => calculatePresetDates('this_month'), [])
  const [pengeluaranList, setPengeluaranList] = useState([])
  const [summaryData, setSummaryData] = useState({ total_pengeluaran: 0, breakdown_per_kategori: {} })
  const [kandangList, setKandangList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filter states
  const [filterKategori, setFilterKategori] = useState('semua')
  const [filterAlokasi, setFilterAlokasi] = useState('semua')
  const [datePreset, setDatePreset] = useState('this_month')
  const [startDate, setStartDate] = useState(defaultDates.start)
  const [endDate, setEndDate] = useState(defaultDates.end)

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
    kandang_id: '',
    jumlah_kg: '',
  })

  // Form Edit State
  const [selectedItem, setSelectedItem] = useState(null)
  const [editForm, setEditForm] = useState({
    tanggal: '',
    kategori: 'pakan',
    nominal: '',
    keterangan: '',
    kandang_id: '',
    jumlah_kg: '',
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

  // Load Kandang List once on mount
  useEffect(() => {
    getKandangList()
      .then((data) => setKandangList(data))
      .catch((err) => console.error('Failed to load kandang list:', err))
  }, [])

  // Load Data with Filters
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filterKategori !== 'semua') params.kategori = filterKategori
      if (filterAlokasi === '0') params.kandang_id = 0
      else if (filterAlokasi !== 'semua') params.kandang_id = parseInt(filterAlokasi, 10)

      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const [listRes, summaryRes] = await Promise.all([
        getPengeluaranList(params),
        getPengeluaranSummary(params),
      ])

      setPengeluaranList(listRes || [])
      setSummaryData(summaryRes || { total_pengeluaran: 0, breakdown_per_kategori: {} })
    } catch (err) {
      setError(err.message || 'Gagal memuat data pengeluaran operasional.')
    } finally {
      setLoading(false)
    }
  }, [filterKategori, filterAlokasi, startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open Create Modal
  const openCreateModal = () => {
    setError('')
    setSuccessMsg('')
    setCreateForm({
      tanggal: formatLocalDate(),
      kategori: 'pakan',
      nominal: '',
      keterangan: '',
      kandang_id: '',
      jumlah_kg: '',
    })
    setShowCreateModal(true)
  }

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const nominalNum = parseFloat(createForm.nominal)
      if (isNaN(nominalNum) || nominalNum <= 0) {
        throw new Error('Nominal pengeluaran harus berupa angka lebih dari 0.')
      }

      const payload = {
        tanggal: createForm.tanggal,
        kategori: createForm.kategori,
        nominal: nominalNum,
        keterangan: createForm.keterangan.trim() || undefined,
        kandang_id: createForm.kandang_id ? parseInt(createForm.kandang_id, 10) : undefined,
      }

      if (createForm.kategori === 'pakan') {
        const kg = parseFloat(createForm.jumlah_kg)
        if (isNaN(kg) || kg <= 0) {
          throw new Error('Jumlah pakan fisik (kg) wajib diisi untuk kategori pakan.')
        }
        payload.jumlah_kg = kg
      }

      await createPengeluaran(payload)
      setSuccessMsg('Pengeluaran berhasil dicatat!')
      setShowCreateModal(false)
      await loadData()
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
      nominal: item.nominal,
      keterangan: item.keterangan || '',
      kandang_id: item.kandang_id !== null && item.kandang_id !== undefined ? String(item.kandang_id) : '',
      jumlah_kg: item.jumlah_kg !== null && item.jumlah_kg !== undefined ? String(item.jumlah_kg) : '',
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
      const nominalNum = parseFloat(editForm.nominal)
      if (isNaN(nominalNum) || nominalNum <= 0) {
        throw new Error('Nominal pengeluaran harus berupa angka lebih dari 0.')
      }

      const payload = {
        tanggal: editForm.tanggal,
        kategori: editForm.kategori,
        nominal: nominalNum,
        keterangan: editForm.keterangan.trim() || undefined,
        kandang_id: editForm.kandang_id ? parseInt(editForm.kandang_id, 10) : null,
      }

      if (editForm.kategori === 'pakan') {
        const kg = parseFloat(editForm.jumlah_kg)
        if (isNaN(kg) || kg <= 0) {
          throw new Error('Jumlah pakan fisik (kg) wajib diisi untuk kategori pakan.')
        }
        payload.jumlah_kg = kg
      } else {
        payload.jumlah_kg = null
      }

      await updatePengeluaran(selectedItem.id, payload)
      setSuccessMsg(`Pengeluaran #${selectedItem.id} berhasil diperbarui!`)
      setShowEditModal(false)
      await loadData()
    } catch (err) {
      setError(err.message || 'Gagal memperbarui pengeluaran.')
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
      const res = await deletePengeluaran(selectedItem.id)
      setSuccessMsg(res.message || `Pengeluaran #${selectedItem.id} berhasil dihapus.`)
      setShowDeleteModal(false)
      await loadData()
    } catch (err) {
      setError(err.message || 'Gagal menghapus pengeluaran.')
    } finally {
      setSubmitting(false)
    }
  }

  // Top category computation
  const topCategoryInfo = useMemo(() => {
    const breakdown = summaryData.breakdown_per_kategori || {}
    let maxNominal = 0
    let maxKey = '-'
    for (const [k, v] of Object.entries(breakdown)) {
      if (v > maxNominal) {
        maxNominal = v
        maxKey = k
      }
    }
    const total = summaryData.total_pengeluaran || 0
    const pct = total > 0 ? Math.round((maxNominal / total) * 100) : 0
    return {
      kategori: KATEGORI_CONFIG[maxKey]?.label || maxKey,
      nominal: maxNominal,
      percentage: pct,
    }
  }, [summaryData])

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <PageHeader
        title="Pengeluaran Operasional Peternakan"
        subtitle="Pencatatan biaya pakan, vitamin, operasional, dan gaji. Agregasi ringkasan biaya serta alokasi per kandang."
        action={
          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran</span>
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

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pengeluaran */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-content-secondary text-xs font-semibold mb-2">
            <span>Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 tracking-tight font-mono">
            {formatRupiah(summaryData.total_pengeluaran)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-content-secondary">
            <Calendar className="w-3.5 h-3.5 text-brand" />
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
        </Card>

        {/* Card 2: Kategori Terbesar */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-content-secondary text-xs font-semibold mb-2">
            <span>Kategori Terbesar</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-content-primary tracking-tight flex items-baseline gap-2">
            <span>{topCategoryInfo.kategori}</span>
            {topCategoryInfo.percentage > 0 && (
              <Badge variant="info" size="sm">
                {topCategoryInfo.percentage}%
              </Badge>
            )}
          </div>
          <div className="mt-2 text-xs text-content-secondary">
            Nominal: <span className="text-content-primary font-bold font-mono">{formatRupiah(topCategoryInfo.nominal)}</span>
          </div>
        </Card>

        {/* Card 3: Total Transaksi */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-content-secondary text-xs font-semibold mb-2">
            <span>Catatan Transaksi</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-content-primary tracking-tight font-mono">
            {formatNumber(pengeluaranList.length)}{' '}
            <span className="text-sm font-normal text-content-secondary">entri</span>
          </div>
          <div className="mt-2 text-xs text-content-secondary">
            Rata-rata: <span className="text-content-primary font-bold font-mono">
              {pengeluaranList.length > 0
                ? formatRupiah(summaryData.total_pengeluaran / pengeluaranList.length)
                : 'Rp 0'}
            </span>
          </div>
        </Card>

        {/* Card 4: Filter Alokasi Aktif */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-content-secondary text-xs font-semibold mb-2">
            <span>Cakupan Alokasi</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-bold text-content-primary tracking-tight truncate">
            {filterAlokasi === 'semua'
              ? 'Seluruh Peternakan'
              : filterAlokasi === '0'
              ? 'Biaya Umum Saja'
              : kandangList.find((k) => String(k.id) === String(filterAlokasi))?.nama_kandang || 'Kandang'}
          </div>
          <div className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Tersinkronisasi database</span>
          </div>
        </Card>
      </div>

      {/* Interactive Filter Bar */}
      <Card className="p-4 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Tanggal Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-xs text-content-secondary font-bold uppercase tracking-wider mr-1">
              Rentang:
            </span>
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
                className={`px-3 py-2 min-h-[44px] rounded-lg transition font-bold cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-surface-muted text-content-secondary hover:text-content-primary border border-border-subtle'
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

        {/* Dropdowns Filter: Kategori & Alokasi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border-subtle text-xs">
          <div>
            <label className="block text-content-secondary font-bold uppercase tracking-wider mb-1.5">
              Filter Kategori
            </label>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3 py-2 min-h-[44px] text-content-primary text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="semua">Semua Kategori</option>
              {Object.entries(KATEGORI_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label} ({cfg.desc})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-content-secondary font-bold uppercase tracking-wider mb-1.5">
              Filter Alokasi Biaya
            </label>
            <select
              value={filterAlokasi}
              onChange={(e) => setFilterAlokasi(e.target.value)}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3 py-2 min-h-[44px] text-content-primary text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
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
      </Card>

      {/* Category Breakdown Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        {Object.entries(KATEGORI_CONFIG).map(([katKey, cfg]) => {
          const nominal = summaryData.breakdown_per_kategori?.[katKey] || 0
          const isSelected = filterKategori === katKey
          return (
            <div
              key={katKey}
              onClick={() => setFilterKategori(isSelected ? 'semua' : katKey)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? 'bg-brand-light border-brand shadow-xs'
                  : 'bg-white border-border-subtle hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-content-primary">{cfg.label}</span>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              </div>
              <div className="font-bold text-content-secondary font-mono truncate">{formatRupiah(nominal)}</div>
            </div>
          )
        })}
      </div>

      {/* Riwayat Pengeluaran (Table on Desktop >= md, Card List on Mobile < md) */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-content-muted">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm font-medium">Memuat data pengeluaran operasional...</p>
        </div>
      ) : pengeluaranList.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-brand" />}
          title="Tidak Ada Catatan Pengeluaran"
          description="Tidak ditemukan rekaman transaksi pengeluaran pada periode atau filter terpilih."
          action={
            <button
              onClick={openCreateModal}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Catat Pengeluaran Sekarang
            </button>
          }
        />
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (hidden on mobile < md) */}
          <div className="hidden md:block border border-border-subtle rounded-xl bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold text-content-primary text-base">Riwayat Transaksi Pengeluaran</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-muted text-content-secondary text-xs font-bold">
                {pengeluaranList.length} Baris
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-border-subtle text-content-secondary uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Alokasi</th>
                  <th className="py-3.5 px-4">Keterangan</th>
                  <th className="py-3.5 px-4 text-right">Nominal</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {pengeluaranList.map((item) => {
                  const cfg = KATEGORI_CONFIG[item.kategori] || KATEGORI_CONFIG.lain_lain
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      {/* Tanggal */}
                      <td className="py-3.5 px-4 font-bold text-content-primary whitespace-nowrap">
                        {formatDisplayDate(item.tanggal)}
                      </td>

                      {/* Kategori Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.badgeClass}`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Alokasi */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.kandang_id ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs">
                            <Home className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{item.nama_kandang || `Kandang #${item.kandang_id}`}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-muted text-content-secondary border border-border-subtle font-medium text-xs">
                            <Building2 className="w-3.5 h-3.5 text-content-muted" />
                            <span>Biaya Umum Peternakan</span>
                          </span>
                        )}
                      </td>

                      {/* Keterangan */}
                      <td className="py-3.5 px-4 text-content-secondary max-w-xs truncate">
                        {item.keterangan || <span className="text-content-muted italic">-</span>}
                      </td>

                      {/* Nominal & Berat Pakan */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-black text-rose-700">
                          {formatRupiah(item.nominal)}
                        </div>
                        {item.kategori === 'pakan' && item.jumlah_kg && (
                          <div className="text-[11px] font-mono text-emerald-700 font-semibold">
                            ({formatWeight(item.jumlah_kg)})
                          </div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit pengeluaran"
                            className="p-1.5 rounded-lg bg-surface-muted hover:bg-slate-200 text-content-secondary hover:text-content-primary border border-border-subtle transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            title="Hapus pengeluaran"
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
                  Riwayat Transaksi Pengeluaran
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-muted text-content-secondary text-[11px] font-bold border border-border-subtle">
                {pengeluaranList.length} Catatan
              </span>
            </div>

            {/* Daftar Kartu Pengeluaran */}
            <div className="flex flex-col gap-3">
              {pengeluaranList.map((item) => {
              const cfg = KATEGORI_CONFIG[item.kategori] || KATEGORI_CONFIG.lain_lain
              return (
                <Card key={item.id} className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-border-subtle pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.badgeClass}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                          {cfg.label}
                        </span>
                        {item.kategori === 'pakan' && item.jumlah_kg && (
                          <span className="text-xs font-mono font-bold text-emerald-700">
                            {formatWeight(item.jumlah_kg)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-content-secondary mt-1">
                        {formatDisplayDate(item.tanggal)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-sm text-rose-700">
                        {formatRupiah(item.nominal)}
                      </span>
                    </div>
                  </div>

                  {/* Body: Alokasi & Keterangan */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-content-secondary">Alokasi:</span>
                      {item.kandang_id ? (
                        <span className="font-bold text-brand flex items-center gap-1">
                          <Home className="w-3.5 h-3.5" />
                          <span>{item.nama_kandang || `Kandang #${item.kandang_id}`}</span>
                        </span>
                      ) : (
                        <span className="font-medium text-content-secondary flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-content-muted" />
                          <span>Biaya Umum Peternakan</span>
                        </span>
                      )}
                    </div>
                    {item.keterangan && (
                      <p className="text-content-secondary bg-surface-muted/60 p-2 rounded-lg">
                        <span className="font-semibold text-content-primary">Catatan:</span> {item.keterangan}
                      </p>
                    )}
                  </div>

                  {/* Actions (min-h-[44px] touch target) */}
                  <div className="pt-2 border-t border-border-subtle grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary text-xs font-bold border border-border-subtle transition active:scale-95 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 text-brand" />
                      <span>Edit Pengeluaran</span>
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

      {/* ADAPTIVE MODAL: Tambah Pengeluaran Baru */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Catat Pengeluaran Baru"
        subtitle="Input transaksi biaya pakan, operasional, atau overhead peternakan."
        icon={<Receipt className="w-5 h-5 text-brand" />}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {/* Tanggal */}
          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
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

          {/* Kategori */}
          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
              Kategori Pengeluaran *
            </label>
            <select
              required
              value={createForm.kategori}
              onChange={(e) => {
                const newKat = e.target.value
                setCreateForm({
                  ...createForm,
                  kategori: newKat,
                  jumlah_kg: newKat === 'pakan' ? createForm.jumlah_kg : '',
                })
              }}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand font-semibold"
            >
              {Object.entries(KATEGORI_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label} - {cfg.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Input: Jumlah Pakan Fisik (Kg) */}
          {createForm.kategori === 'pakan' && (
            <div className="p-3.5 rounded-xl bg-surface-page border border-border-subtle space-y-1">
              <label className="block text-content-primary font-bold uppercase tracking-wider">
                Jumlah Pakan Fisik (Kg) <span className="text-emerald-700">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  min="0.01"
                  step="any"
                  placeholder="0.0"
                  value={createForm.jumlah_kg}
                  onChange={(e) => setCreateForm({ ...createForm, jumlah_kg: e.target.value })}
                  className="w-full bg-white border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <span className="absolute right-3.5 top-3 text-content-secondary font-mono text-xs font-semibold">
                  kg
                </span>
              </div>
              <p className="text-[11px] text-content-secondary pt-0.5">
                Digunakan otomatis untuk menghitung FCR (Feed Conversion Ratio) di modul analitik.
              </p>
            </div>
          )}

          {/* Nominal */}
          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
              Nominal (Rupiah) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-content-secondary font-bold text-xs">
                Rp
              </span>
              <input
                type="number"
                inputMode="numeric"
                required
                min="1"
                step="1"
                placeholder="0"
                value={createForm.nominal}
                onChange={(e) => setCreateForm({ ...createForm, nominal: e.target.value })}
                className="w-full bg-surface-page border border-border-subtle rounded-xl pl-10 pr-3.5 py-2.5 min-h-[44px] text-content-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            {createForm.nominal && !isNaN(parseFloat(createForm.nominal)) && (
              <p className="mt-1 text-xs text-rose-700 font-mono font-bold">
                Format: {formatRupiah(parseFloat(createForm.nominal))}
              </p>
            )}
          </div>

          {/* Alokasi Kandang (Opsional) */}
          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
              Alokasi Biaya <span className="text-content-muted font-normal">(Opsional)</span>
            </label>
            <select
              value={createForm.kandang_id}
              onChange={(e) => setCreateForm({ ...createForm, kandang_id: e.target.value })}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Biaya Umum Peternakan (Overhead / Seluruh Kandang)</option>
              {kandangList.map((k) => (
                <option key={k.id} value={k.id}>
                  Kandang {k.nama_kandang} (Populasi: {formatNumber(k.jumlah_saat_ini)} ekor)
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-content-secondary">
              Pilih kandang jika biaya langsung. Kosongkan untuk biaya bersama peternakan.
            </p>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
              Catatan / Keterangan <span className="text-content-muted font-normal">(Opsional)</span>
            </label>
            <textarea
              rows="2"
              placeholder="Misal: Pembelian pakan konsentrat 10 sak dari Toko Unggas Sejahtera"
              value={createForm.keterangan}
              onChange={(e) => setCreateForm({ ...createForm, keterangan: e.target.value })}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2 text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand"
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
              <span>Simpan Pengeluaran</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ADAPTIVE MODAL: Edit Pengeluaran */}
      <Modal
        isOpen={showEditModal && !!selectedItem}
        onClose={() => setShowEditModal(false)}
        title={`Edit Pengeluaran #${selectedItem?.id || ''}`}
        subtitle="Perbarui nominal atau alokasi biaya pengeluaran operasional."
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
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
              Kategori Pengeluaran *
            </label>
            <select
              required
              value={editForm.kategori}
              onChange={(e) => {
                const newKat = e.target.value
                setEditForm({
                  ...editForm,
                  kategori: newKat,
                  jumlah_kg: newKat === 'pakan' ? editForm.jumlah_kg : '',
                })
              }}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand font-semibold"
            >
              {Object.entries(KATEGORI_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label} - {cfg.desc}
                </option>
              ))}
            </select>
          </div>

          {editForm.kategori === 'pakan' && (
            <div className="p-3.5 rounded-xl bg-surface-page border border-border-subtle space-y-1">
              <label className="block text-content-primary font-bold uppercase tracking-wider">
                Jumlah Pakan Fisik (Kg) <span className="text-emerald-700">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  min="0.01"
                  step="any"
                  placeholder="0.0"
                  value={editForm.jumlah_kg}
                  onChange={(e) => setEditForm({ ...editForm, jumlah_kg: e.target.value })}
                  className="w-full bg-white border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <span className="absolute right-3.5 top-3 text-content-secondary font-mono text-xs font-semibold">
                  kg
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
              Nominal (Rupiah) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-content-secondary font-bold text-xs">
                Rp
              </span>
              <input
                type="number"
                inputMode="numeric"
                required
                min="1"
                step="1"
                value={editForm.nominal}
                onChange={(e) => setEditForm({ ...editForm, nominal: e.target.value })}
                className="w-full bg-surface-page border border-border-subtle rounded-xl pl-10 pr-3.5 py-2.5 min-h-[44px] text-content-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            {editForm.nominal && !isNaN(parseFloat(editForm.nominal)) && (
              <p className="mt-1 text-xs text-rose-700 font-mono font-bold">
                Format: {formatRupiah(parseFloat(editForm.nominal))}
              </p>
            )}
          </div>

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
              Alokasi Kandang
            </label>
            <select
              value={editForm.kandang_id}
              onChange={(e) => setEditForm({ ...editForm, kandang_id: e.target.value })}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2.5 min-h-[44px] text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Biaya Umum Peternakan (Overhead / Seluruh Kandang)</option>
              {kandangList.map((k) => (
                <option key={k.id} value={k.id}>
                  Kandang {k.nama_kandang}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1">
              Keterangan
            </label>
            <textarea
              rows="2"
              value={editForm.keterangan}
              onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
              className="w-full bg-surface-page border border-border-subtle rounded-xl px-3.5 py-2 text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
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
        title="Hapus Pengeluaran?"
        subtitle="Konfirmasi penghapusan catatan transaksi pengeluaran operasional."
        icon={<Trash2 className="w-5 h-5 text-rose-600" />}
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 mb-5">
          <p className="text-xs text-content-secondary">
            Tindakan ini permanen dan akan menghapus catatan pengeluaran dari agregasi keuangan.
          </p>
          <div className="p-3.5 rounded-xl bg-surface-page border border-border-subtle space-y-2 text-xs">
            <div className="flex justify-between text-content-secondary">
              <span>Tanggal:</span>
              <span className="text-content-primary font-bold">
                {selectedItem ? formatDisplayDate(selectedItem.tanggal) : ''}
              </span>
            </div>
            <div className="flex justify-between text-content-secondary">
              <span>Kategori:</span>
              <span className="text-content-primary font-bold capitalize">
                {KATEGORI_CONFIG[selectedItem?.kategori]?.label || selectedItem?.kategori}
              </span>
            </div>
            <div className="flex justify-between text-content-secondary">
              <span>Nominal:</span>
              <span className="text-rose-700 font-mono font-black">
                {selectedItem ? formatRupiah(selectedItem.nominal) : ''}
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

export default PengeluaranPage
