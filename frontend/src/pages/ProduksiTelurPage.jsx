import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { getKandangList } from '../services/kandangService'
import {
  createProduksiTelur,
  updateProduksiTelur,
  deleteProduksiTelur,
  getRiwayatProduksi,
  getProduksiPerformanceAnalytics,
} from '../services/produksiTelurService'
import { ProduksiChart } from '../components/produksi/ProduksiChart'
import {
  Egg,
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
  AlertTriangle,
  FileText,
  Filter,
  TrendingUp,
} from 'lucide-react'
import {
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

// Helper date formatter for presets
export function calculatePresetDates(preset) {
  const today = new Date()

  if (preset === 'today') {
    const todayStr = formatLocalDate(today)
    return { start: todayStr, end: todayStr }
  } else if (preset === '7days') {
    const past7 = new Date()
    past7.setDate(today.getDate() - 6)
    return { start: formatLocalDate(past7), end: formatLocalDate(today) }
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

export function ProduksiTelurPage() {
  const defaultDates = useMemo(() => calculatePresetDates('7days'), [])
  const [produksiList, setProduksiList] = useState([])
  const [analyticsData, setAnalyticsData] = useState(null)
  const [kandangList, setKandangList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filter States - Sinkron dengan default 7 hari terakhir
  const [filterKandang, setFilterKandang] = useState('semua')
  const [datePreset, setDatePreset] = useState('7days')
  const [startDate, setStartDate] = useState(defaultDates.start)
  const [endDate, setEndDate] = useState(defaultDates.end)

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 409 Conflict In-Form State
  const [duplicateConflict, setDuplicateConflict] = useState(null)

  // Form Create State
  const [createForm, setCreateForm] = useState({
    kandang_id: '',
    tanggal: formatLocalDate(),
    jumlah_butir_normal: '',
    jumlah_butir_retak: '0',
    jumlah_butir_pecah: '0',
    catatan: '',
  })

  // Form Edit State
  const [selectedProduksi, setSelectedProduksi] = useState(null)
  const [editForm, setEditForm] = useState({
    tanggal: '',
    jumlah_butir_normal: '',
    jumlah_butir_retak: '',
    jumlah_butir_pecah: '',
    catatan: '',
  })

  // Handle preset change
  const handlePresetChange = (preset) => {
    setDatePreset(preset)
    if (preset === 'semua') {
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
    getKandangList('aktif')
      .then((data) => setKandangList(data))
      .catch((err) => console.error('Failed to load kandang:', err))
  }, [])

  // Load Riwayat Produksi & Analytics with active server-side filters
  const loadData = useCallback(async () => {
    if (datePreset !== 'semua' && (!startDate || !endDate)) {
      return
    }

    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filterKandang !== 'semua') {
        params.kandangId = filterKandang
      }
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const [historyData, analyticsRes] = await Promise.all([
        getRiwayatProduksi(params),
        getProduksiPerformanceAnalytics(params),
      ])

      setProduksiList(historyData || [])
      setAnalyticsData(analyticsRes || null)
    } catch (err) {
      setError(err.message || 'Gagal memuat data dan analitik produksi telur.')
    } finally {
      setLoading(false)
    }
  }, [filterKandang, datePreset, startDate, endDate])

  // Reload when filters change with anti-race-condition cleanup
  useEffect(() => {
    let isCurrent = true

    if (datePreset === 'custom' && (!startDate || !endDate)) {
      return
    }
    if (datePreset !== 'semua' && (!startDate || !endDate)) {
      return
    }

    setLoading(true)
    setError('')

    const params = {}
    if (filterKandang !== 'semua') {
      params.kandangId = filterKandang
    }
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate

    Promise.all([
      getRiwayatProduksi(params),
      getProduksiPerformanceAnalytics(params),
    ])
      .then(([historyData, analyticsRes]) => {
        if (!isCurrent) return
        setProduksiList(historyData || [])
        setAnalyticsData(analyticsRes || null)
      })
      .catch((err) => {
        if (!isCurrent) return
        setError(err.message || 'Gagal memuat data dan analitik produksi telur.')
      })
      .finally(() => {
        if (isCurrent) {
          setLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [filterKandang, datePreset, startDate, endDate])

  // Open Create Modal
  const openCreateModal = (kandangId = null) => {
    setError('')
    setSuccessMsg('')
    setDuplicateConflict(null)
    const defaultKandangId =
      kandangId || (kandangList.length > 0 ? kandangList[0].id : '')
    setCreateForm({
      kandang_id: defaultKandangId,
      tanggal: formatLocalDate(),
      jumlah_butir_normal: '',
      jumlah_butir_retak: '0',
      jumlah_butir_pecah: '0',
      catatan: '',
    })
    setShowCreateModal(true)
  }

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMsg('')
    setDuplicateConflict(null)

    try {
      const kandangId = parseInt(createForm.kandang_id, 10)
      const normal = parseInt(createForm.jumlah_butir_normal, 10)
      const retak = parseInt(createForm.jumlah_butir_retak || 0, 10)
      const pecah = parseInt(createForm.jumlah_butir_pecah || 0, 10)

      if (!kandangId || isNaN(normal) || normal < 0 || isNaN(retak) || retak < 0 || isNaN(pecah) || pecah < 0) {
        throw new Error('Semua input butir telur harus berupa angka valid (>= 0).')
      }

      const payload = {
        kandang_id: kandangId,
        tanggal: createForm.tanggal,
        jumlah_butir_normal: normal,
        jumlah_butir_retak: retak,
        jumlah_butir_pecah: pecah,
        catatan: createForm.catatan.trim() || undefined,
      }

      await createProduksiTelur(payload)
      setSuccessMsg('Data produksi telur harian berhasil dicatat!')
      setShowCreateModal(false)
      await loadData()
    } catch (err) {
      if (err.status === 409) {
        const existingRec = produksiList.find(
          (p) =>
            p.kandang_id === parseInt(createForm.kandang_id, 10) &&
            p.tanggal === createForm.tanggal
        )
        setDuplicateConflict({
          message: err.message,
          existingRecord: existingRec || null,
          kandangId: createForm.kandang_id,
          tanggal: createForm.tanggal,
        })
      } else {
        setError(err.message || 'Gagal menyimpan data produksi telur.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Switch from Duplicate Conflict to Edit
  const handleSwitchToEditFromConflict = () => {
    if (duplicateConflict && duplicateConflict.existingRecord) {
      openEditModal(duplicateConflict.existingRecord)
      setShowCreateModal(false)
      setDuplicateConflict(null)
    } else {
      loadData().then(() => {
        setShowCreateModal(false)
        setDuplicateConflict(null)
      })
    }
  }

  // Open Edit Modal
  const openEditModal = (item) => {
    setSelectedProduksi(item)
    setEditForm({
      tanggal: item.tanggal,
      jumlah_butir_normal: item.jumlah_butir_normal,
      jumlah_butir_retak: item.jumlah_butir_retak,
      jumlah_butir_pecah: item.jumlah_butir_pecah,
      catatan: item.catatan || '',
    })
    setShowEditModal(true)
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedProduksi) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const normal = parseInt(editForm.jumlah_butir_normal, 10)
      const retak = parseInt(editForm.jumlah_butir_retak || 0, 10)
      const pecah = parseInt(editForm.jumlah_butir_pecah || 0, 10)

      if (isNaN(normal) || normal < 0 || isNaN(retak) || retak < 0 || isNaN(pecah) || pecah < 0) {
        throw new Error('Jumlah butir telur tidak boleh bernilai negatif.')
      }

      const payload = {
        tanggal: editForm.tanggal,
        jumlah_butir_normal: normal,
        jumlah_butir_retak: retak,
        jumlah_butir_pecah: pecah,
        catatan: editForm.catatan.trim() || undefined,
      }

      await updateProduksiTelur(selectedProduksi.id, payload)
      setSuccessMsg(`Data produksi telur #${selectedProduksi.id} berhasil diperbarui!`)
      setShowEditModal(false)
      await loadData()
    } catch (err) {
      setError(err.message || 'Gagal memperbarui data produksi telur.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Delete Modal
  const openDeleteModal = (item) => {
    setSelectedProduksi(item)
    setShowDeleteModal(true)
  }

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedProduksi) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const res = await deleteProduksiTelur(selectedProduksi.id)
      setSuccessMsg(res.message || `Data produksi #${selectedProduksi.id} berhasil dihapus.`)
      setShowDeleteModal(false)
      await loadData()
    } catch (err) {
      setError(err.message || 'Gagal menghapus data produksi telur.')
    } finally {
      setSubmitting(false)
    }
  }

  // KPI Calculations from Current Filtered List
  const totalNormal = useMemo(
    () => produksiList.reduce((acc, curr) => acc + curr.jumlah_butir_normal, 0),
    [produksiList]
  )
  const totalRetak = useMemo(
    () => produksiList.reduce((acc, curr) => acc + curr.jumlah_butir_retak, 0),
    [produksiList]
  )
  const totalPecah = useMemo(
    () => produksiList.reduce((acc, curr) => acc + curr.jumlah_butir_pecah, 0),
    [produksiList]
  )
  const totalSemuaButir = totalNormal + totalRetak + totalPecah

  // Form Live Calculations
  const createTotalLive =
    (parseInt(createForm.jumlah_butir_normal, 10) || 0) +
    (parseInt(createForm.jumlah_butir_retak, 10) || 0) +
    (parseInt(createForm.jumlah_butir_pecah, 10) || 0)

  const editTotalLive =
    (parseInt(editForm.jumlah_butir_normal, 10) || 0) +
    (parseInt(editForm.jumlah_butir_retak, 10) || 0) +
    (parseInt(editForm.jumlah_butir_pecah, 10) || 0)

  // Realtime Sanity Check Calculation for Create Form
  const selectedCreateKandang = kandangList.find(
    (k) => k.id === parseInt(createForm.kandang_id, 10)
  )
  const createPopulasi = selectedCreateKandang?.jumlah_saat_ini || 0
  const normalInputCreate = parseInt(createForm.jumlah_butir_normal, 10) || 0
  const isCreateAnomaly =
    createPopulasi > 0 && normalInputCreate > createPopulasi
  const createHdpLive =
    createPopulasi > 0 && normalInputCreate > 0
      ? ((normalInputCreate / createPopulasi) * 100).toFixed(2)
      : '0.00'

  // Realtime Sanity Check Calculation for Edit Form
  const selectedEditKandang = kandangList.find(
    (k) => k.id === selectedProduksi?.kandang_id
  )
  const editPopulasi =
    selectedProduksi?.populasi_ayam || selectedEditKandang?.jumlah_saat_ini || 0
  const normalInputEdit = parseInt(editForm.jumlah_butir_normal, 10) || 0
  const isEditAnomaly = editPopulasi > 0 && normalInputEdit > editPopulasi
  const editHdpLive =
    editPopulasi > 0 && normalInputEdit > 0
      ? ((normalInputEdit / editPopulasi) * 100).toFixed(2)
      : '0.00'

  return (
    <div className="space-y-5">
      {/* Top Page Header */}
      <PageHeader
        title="Produksi & Performa HDP Telur"
        subtitle="Monitoring Hen Day Production (HDP%), visualisasi grafik time-series, dan manajemen panen harian."
        action={
          <button
            onClick={() => openCreateModal()}
            disabled={kandangList.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Produksi Telur</span>
          </button>
        }
      />

      {/* Mini KPI Summary Cards (Aggregated from Filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-content-secondary">Butir Normal</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 font-mono">
              {formatNumber(totalNormal)}{' '}
              <span className="text-xs text-content-muted font-normal">butir</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Egg className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-content-secondary">Cangkang Retak</p>
            <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1 font-mono">
              {formatNumber(totalRetak)}{' '}
              <span className="text-xs text-content-muted font-normal">butir</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-content-secondary">Pecah / Rusak</p>
            <p className="text-xl sm:text-2xl font-black text-rose-700 mt-1 font-mono">
              {formatNumber(totalPecah)}{' '}
              <span className="text-xs text-content-muted font-normal">butir</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <X className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-content-secondary">Total Panen</p>
            <p className="text-xl sm:text-2xl font-black text-content-primary mt-1 font-mono">
              {formatNumber(totalSemuaButir)}{' '}
              <span className="text-xs text-content-muted font-normal">butir</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </Card>
      </div>

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

      {/* Filter Bar Interaktif */}
      <Card className="p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Kandang Selector */}
          <div className="flex items-center gap-2.5">
            <Filter className="w-4 h-4 text-brand shrink-0" />
            <span className="text-xs text-content-secondary font-bold uppercase tracking-wider">
              Kandang:
            </span>
            <select
              value={filterKandang}
              onChange={(e) => setFilterKandang(e.target.value)}
              className="px-3 py-2 min-h-[44px] rounded-xl bg-surface-page border border-border-subtle text-xs font-semibold text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="semua">Semua Kandang Aktif</option>
              {kandangList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kandang}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-xs text-content-secondary font-bold uppercase tracking-wider mr-1">
              Rentang:
            </span>
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: '7days', label: '7 Hari Terakhir' },
              { id: '30days', label: '30 Hari Terakhir' },
              { id: 'this_month', label: 'Bulan Ini' },
              { id: 'semua', label: 'Semua Waktu' },
              { id: 'custom', label: 'Kustom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-2 min-h-[44px] rounded-lg font-bold transition cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-surface-muted text-content-secondary hover:text-content-primary border border-border-subtle'
                }`}
              >
                {p.label}
              </button>
            ))}

            <button
              onClick={loadData}
              title="Refresh Data"
              className="p-2.5 min-h-[44px] rounded-lg bg-surface-muted hover:bg-slate-200 border border-border-subtle text-content-secondary hover:text-content-primary transition ml-1 cursor-pointer flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Custom Range Inputs (Shown when 'custom' is active) */}
        {datePreset === 'custom' && (
          <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center gap-3 text-xs">
            <span className="text-content-secondary font-medium">Dari Tanggal:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 min-h-[44px] rounded-xl bg-surface-page border border-border-subtle text-content-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <span className="text-content-secondary font-medium">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 min-h-[44px] rounded-xl bg-surface-page border border-border-subtle text-content-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="text-xs text-brand hover:underline font-semibold transition cursor-pointer"
              >
                Reset Tanggal
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Visual Multi-Axis Performance Chart */}
      <ProduksiChart analyticsData={analyticsData} loading={loading} />

      {/* Production Records (Table on Desktop >= md, Card List on Mobile < md) */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-content-muted">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm font-medium">Memuat riwayat data produksi...</p>
        </div>
      ) : produksiList.length === 0 ? (
        <EmptyState
          icon={<Egg className="w-8 h-8 text-amber-500" />}
          title="Tidak Ada Data Produksi Telur"
          description={
            filterKandang !== 'semua' || startDate || endDate
              ? 'Tidak ditemukan catatan panen telur dengan kriteria filter saat ini.'
              : 'Klik tombol "Catat Produksi Telur" untuk mulai mencatat hasil panen harian.'
          }
          action={
            <button
              onClick={() => openCreateModal()}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Catat Panen Sekarang
            </button>
          }
        />
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (hidden on mobile < md) */}
          <div className="hidden md:block border border-border-subtle rounded-xl bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Egg className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-content-primary text-base">Riwayat Panen & Produksi Telur</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-muted text-content-secondary text-xs font-bold">
                {produksiList.length} Catatan
              </span>
            </div>

            <table className="w-full text-left text-xs text-content-primary">
              <thead className="bg-surface-muted text-content-secondary uppercase tracking-wider text-[10px] font-bold border-b border-border-subtle">
                <tr>
                  <th className="px-4 py-3.5">Tanggal</th>
                  <th className="px-4 py-3.5">Kandang</th>
                  <th className="px-4 py-3.5 text-right">Butir Normal</th>
                  <th className="px-4 py-3.5 text-right">Cangkang Retak</th>
                  <th className="px-4 py-3.5 text-right">Pecah/Rusak</th>
                  <th className="px-4 py-3.5 text-right font-bold text-content-primary">Total Butir</th>
                  <th className="px-4 py-3.5 text-center">HDP (%)</th>
                  <th className="px-4 py-3.5">Catatan</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {produksiList.map((item) => {
                  const kandangName =
                    item.nama_kandang ||
                    kandangList.find((k) => k.id === item.kandang_id)?.nama_kandang ||
                    `Kandang #${item.kandang_id}`
                  const totalItem =
                    item.total_butir ||
                    item.jumlah_butir_normal + item.jumlah_butir_retak + item.jumlah_butir_pecah
                  const hdpVal = item.hdp_percentage !== undefined ? item.hdp_percentage : 0
                  const isAnomaly = item.is_hdp_anomaly || hdpVal > 100

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5 font-bold text-content-primary">
                        {formatDisplayDate(item.tanggal)}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-brand">
                        {kandangName}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-700 font-mono">
                        {formatNumber(item.jumlah_butir_normal)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono">
                        {item.jumlah_butir_retak > 0 ? (
                          <Badge variant="warning" size="sm">
                            {formatNumber(item.jumlah_butir_retak)}
                          </Badge>
                        ) : (
                          <span className="text-content-muted">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono">
                        {item.jumlah_butir_pecah > 0 ? (
                          <Badge variant="danger" size="sm">
                            {formatNumber(item.jumlah_butir_pecah)}
                          </Badge>
                        ) : (
                          <span className="text-content-muted">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-content-primary font-mono">
                        {formatNumber(totalItem)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant={isAnomaly ? 'warning' : hdpVal >= 85 ? 'success' : hdpVal >= 70 ? 'warning' : 'danger'}
                          size="sm"
                          icon={isAnomaly ? <AlertTriangle className="w-3.5 h-3.5" /> : undefined}
                        >
                          {hdpVal}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-content-secondary max-w-xs truncate">
                        {item.catatan || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Catatan Produksi"
                            className="p-1.5 rounded-lg bg-surface-muted hover:bg-slate-200 text-content-secondary hover:text-content-primary border border-border-subtle transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            title="Hapus Catatan Produksi"
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

            {/* Footer Info */}
            <div className="px-4 py-3 bg-surface-muted/50 border-t border-border-subtle flex items-center justify-between text-xs text-content-secondary font-medium">
              <span>
                Menampilkan <strong className="text-content-primary font-bold">{produksiList.length}</strong> catatan produksi
              </span>
              <span className="text-[11px] text-content-muted">HDP dihitung on-the-fly dari populasi hidup</span>
            </div>
          </div>

          {/* MOBILE CARD LIST VIEW (hidden on desktop >= md) */}
          <div className="md:hidden space-y-3">
            {/* Header Data Tabel Versi Mobile */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Egg className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-content-primary text-sm">
                  Riwayat Panen & Produksi Telur
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-muted text-content-secondary text-[11px] font-bold border border-border-subtle">
                {produksiList.length} Catatan
              </span>
            </div>

            {/* Daftar Kartu Produksi */}
            <div className="flex flex-col gap-3">
              {produksiList.map((item) => {
              const kandangName =
                item.nama_kandang ||
                kandangList.find((k) => k.id === item.kandang_id)?.nama_kandang ||
                `Kandang #${item.kandang_id}`
              const totalItem =
                item.total_butir ||
                item.jumlah_butir_normal + item.jumlah_butir_retak + item.jumlah_butir_pecah
              const hdpVal = item.hdp_percentage !== undefined ? item.hdp_percentage : 0
              const isAnomaly = item.is_hdp_anomaly || hdpVal > 100

              return (
                <Card key={item.id} className="p-4 space-y-3">
                  {/* Card Header: Tanggal & Kandang + HDP Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-border-subtle pb-2.5">
                    <div>
                      <h4 className="font-bold text-sm text-content-primary">
                        {formatDisplayDate(item.tanggal)}
                      </h4>
                      <p className="text-xs font-semibold text-brand mt-0.5">{kandangName}</p>
                    </div>
                    <Badge
                      variant={isAnomaly ? 'warning' : hdpVal >= 85 ? 'success' : hdpVal >= 70 ? 'warning' : 'danger'}
                      size="sm"
                      icon={isAnomaly ? <AlertTriangle className="w-3.5 h-3.5" /> : undefined}
                    >
                      HDP {hdpVal}%
                    </Badge>
                  </div>

                  {/* Card Body: Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Telur Normal:</span>
                      <span className="font-mono font-bold text-sm text-emerald-700">
                        {formatNumber(item.jumlah_butir_normal)} butir
                      </span>
                    </div>
                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Total Panen:</span>
                      <span className="font-mono font-bold text-sm text-content-primary">
                        {formatNumber(totalItem)} butir
                      </span>
                    </div>
                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Retak:</span>
                      <span className="font-mono font-bold text-amber-700">
                        {formatNumber(item.jumlah_butir_retak)} butir
                      </span>
                    </div>
                    <div className="bg-surface-page p-2 rounded-lg border border-border-subtle">
                      <span className="text-[11px] text-content-secondary block">Pecah / Rusak:</span>
                      <span className="font-mono font-bold text-rose-700">
                        {formatNumber(item.jumlah_butir_pecah)} butir
                      </span>
                    </div>
                  </div>

                  {item.catatan && (
                    <div className="text-xs text-content-secondary bg-surface-muted/60 p-2 rounded-lg">
                      <span className="font-semibold text-content-primary">Catatan:</span> {item.catatan}
                    </div>
                  )}

                  {/* Card Actions (min-h-[44px] touch target) */}
                  <div className="pt-2 border-t border-border-subtle grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary text-xs font-bold border border-border-subtle transition active:scale-95 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 text-brand" />
                      <span>Edit Data</span>
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

      {/* ADAPTIVE MODAL: Catat Produksi Baru */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Catat Produksi Telur Harian"
        subtitle="Input panen telur harian per kandang."
        icon={<Egg className="w-5 h-5 text-amber-600" />}
      >
        {/* DUPLICATE CONFLICT WARNING BANNER (409) */}
        {duplicateConflict && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2.5">
            <div className="flex items-start gap-2 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>Data Duplikat Terdeteksi (HTTP 409 Conflict)</span>
            </div>
            <p className="leading-relaxed">
              Data produksi telur untuk kandang ini pada tanggal{' '}
              <strong>{duplicateConflict.tanggal}</strong> sudah pernah dicatat. Satu kandang hanya
              memiliki 1 catatan produksi per tanggal.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSwitchToEditFromConflict}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Buka Form Edit Data Tersebut</span>
              </button>
              <button
                type="button"
                onClick={() => setDuplicateConflict(null)}
                className="px-3 py-2 min-h-[44px] rounded-lg bg-surface-muted hover:bg-slate-200 text-content-primary text-xs font-semibold transition cursor-pointer"
              >
                Ganti Tanggal / Kandang
              </button>
            </div>
          </div>
        )}

        {/* REALTIME SANITY CHECK WARNING BANNER (HDP > 100%) */}
        {isCreateAnomaly && (
          <div className="mb-4 p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-orange-800">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Perhatian: Potensi Anomali Input (HDP &gt; 100%)</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Jumlah telur normal (<strong>{formatNumber(normalInputCreate)} butir</strong>)
              melebihi populasi ayam hidup di kandang ini (<strong>{formatNumber(createPopulasi)} ekor</strong>).
              Nilai HDP akan menjadi <strong className="text-orange-700 font-bold">{createHdpLive}%</strong>.
              Secara biologis 1 ekor ayam maksimal bertelur 1 butir/hari. Pastikan tidak ada kesalahan ketik sebelum menyimpan.
            </p>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-content-primary uppercase tracking-wider mb-1.5">
                Pilih Kandang *
              </label>
              <select
                required
                value={createForm.kandang_id}
                onChange={(e) => setCreateForm({ ...createForm, kandang_id: e.target.value })}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-page border border-border-subtle text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {kandangList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama_kandang} ({formatNumber(k.jumlah_saat_ini)} ekor)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-content-primary uppercase tracking-wider mb-1.5">
                Tanggal Panen *
              </label>
              <input
                type="date"
                required
                value={createForm.tanggal}
                onChange={(e) => setCreateForm({ ...createForm, tanggal: e.target.value })}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-page border border-border-subtle text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          {/* Egg Categories Inputs */}
          <div className="p-4 rounded-xl bg-surface-page border border-border-subtle space-y-3">
            <p className="text-xs font-bold text-content-primary uppercase tracking-wider">
              Kategori Butir Telur
            </p>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-emerald-800">
                  1. Jumlah Butir Normal (Kualitas Bagus) *
                </label>
                {createPopulasi > 0 && (
                  <span className="text-[11px] text-content-secondary">
                    Populasi: <strong className="text-content-primary">{formatNumber(createPopulasi)}</strong> ekor
                  </span>
                )}
              </div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                required
                placeholder="Contoh: 850"
                value={createForm.jumlah_butir_normal}
                onChange={(e) =>
                  setCreateForm({ ...createForm, jumlah_butir_normal: e.target.value })
                }
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white border border-border-subtle text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">
                  2. Cangkang Retak
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={createForm.jumlah_butir_retak}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, jumlah_butir_retak: e.target.value })
                  }
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white border border-border-subtle text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-800 mb-1">
                  3. Rusak / Pecah
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={createForm.jumlah_butir_pecah}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, jumlah_butir_pecah: e.target.value })
                  }
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white border border-border-subtle text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
              <span className="text-content-secondary font-medium">Total Akumulasi:</span>
              <span className="font-bold text-content-primary text-sm bg-white px-3 py-1 rounded-lg border border-border-subtle font-mono">
                {formatNumber(createTotalLive)} butir
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-content-primary uppercase tracking-wider mb-1.5">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Kondisi pakan, suhu cuaca, atau catatan khusus lainnya"
              value={createForm.catatan}
              onChange={(e) => setCreateForm({ ...createForm, catatan: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-page border border-border-subtle text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary font-bold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Simpan Data Produksi</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ADAPTIVE MODAL: Edit Produksi Telur */}
      <Modal
        isOpen={showEditModal && !!selectedProduksi}
        onClose={() => setShowEditModal(false)}
        title={`Koreksi Produksi Telur #${selectedProduksi?.id || ''}`}
        subtitle="Perbarui kuantitas butir telur dan catatan panen."
        icon={<Edit2 className="w-5 h-5 text-emerald-600" />}
      >
        {isEditAnomaly && (
          <div className="mb-4 p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-orange-800">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Perhatian: Potensi Anomali Koreksi (HDP &gt; 100%)</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Koreksi jumlah telur normal (<strong>{formatNumber(normalInputEdit)} butir</strong>)
              melebihi populasi ayam hidup di kandang ini (<strong>{formatNumber(editPopulasi)} ekor</strong>).
              Nilai HDP akan menjadi <strong className="text-orange-700 font-bold">{editHdpLive}%</strong>.
              Secara biologis 1 ekor ayam maksimal bertelur 1 butir/hari.
            </p>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-content-primary uppercase tracking-wider mb-1.5">
              Tanggal Panen *
            </label>
            <input
              type="date"
              required
              value={editForm.tanggal}
              onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-page border border-border-subtle text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="p-4 rounded-xl bg-surface-page border border-border-subtle space-y-3">
            <p className="text-xs font-bold text-content-primary uppercase tracking-wider">
              Koreksi Kategori Butir Telur
            </p>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-emerald-800">
                  1. Jumlah Butir Normal *
                </label>
                {editPopulasi > 0 && (
                  <span className="text-[11px] text-content-secondary">
                    Populasi: <strong className="text-content-primary">{formatNumber(editPopulasi)}</strong> ekor
                  </span>
                )}
              </div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                required
                value={editForm.jumlah_butir_normal}
                onChange={(e) =>
                  setEditForm({ ...editForm, jumlah_butir_normal: e.target.value })
                }
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white border border-border-subtle text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">
                  2. Cangkang Retak
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={editForm.jumlah_butir_retak}
                  onChange={(e) =>
                    setEditForm({ ...editForm, jumlah_butir_retak: e.target.value })
                  }
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white border border-border-subtle text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-800 mb-1">
                  3. Rusak / Pecah
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={editForm.jumlah_butir_pecah}
                  onChange={(e) =>
                    setEditForm({ ...editForm, jumlah_butir_pecah: e.target.value })
                  }
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white border border-border-subtle text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
              <span className="text-content-secondary font-medium">Total Koreksi:</span>
              <span className="font-bold text-content-primary text-sm bg-white px-3 py-1 rounded-lg border border-border-subtle font-mono">
                {formatNumber(editTotalLive)} butir
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-content-primary uppercase tracking-wider mb-1.5">
              Catatan Tambahan
            </label>
            <textarea
              rows={2}
              value={editForm.catatan}
              onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-page border border-border-subtle text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              disabled={submitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary font-bold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ADAPTIVE MODAL: Konfirmasi Hapus */}
      <Modal
        isOpen={showDeleteModal && !!selectedProduksi}
        onClose={() => setShowDeleteModal(false)}
        title="Hapus Data Produksi Telur"
        subtitle={`Konfirmasi pembatalan panen produksi #${selectedProduksi?.id || ''}`}
        icon={<Trash2 className="w-5 h-5 text-rose-600" />}
        maxWidth="max-w-md"
      >
        <div className="space-y-3 text-sm text-content-secondary mb-5">
          <p>
            Anda akan menghapus data produksi telur <strong>#{selectedProduksi?.id}</strong> tanggal{' '}
            <strong>{selectedProduksi ? formatDisplayDate(selectedProduksi.tanggal) : ''}</strong> sejumlah{' '}
            <strong className="text-content-primary">
              {selectedProduksi
                ? formatNumber(
                    selectedProduksi.jumlah_butir_normal +
                      selectedProduksi.jumlah_butir_retak +
                      selectedProduksi.jumlah_butir_pecah
                  )
                : 0}{' '}
              butir
            </strong>
            .
          </p>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            ⚠️ Tindakan ini akan menghapus catatan panen secara permanen dari basis data dan memperbarui kembali stok gudang.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={() => setShowDeleteModal(false)}
            disabled={submitting}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary font-bold text-xs transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDeleteConfirm}
            disabled={submitting}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Hapus Permanen</span>
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default ProduksiTelurPage
