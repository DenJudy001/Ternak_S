import React, { useState, useEffect } from 'react'
import {
  getKandangList,
  createKandang,
  updateKandang,
} from '../services/kandangService'
import {
  createMortalitas,
  updateMortalitas,
  deleteMortalitas,
  getMortalitasByKandang,
  getAllMortalitas,
} from '../services/mortalitasService'
import {
  Plus,
  Edit2,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Home,
  Activity,
  Layers,
  TrendingDown,
  Skull,
  History,
  FileText,
  Trash2,
  RotateCcw,
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

// Helper validasi murni formulir kandang (Client-side Inline Validation)
export function validateKandangForm(values, isEdit = false, selectedKandang = null) {
  const errors = {}

  if (!values.nama_kandang || !values.nama_kandang.trim()) {
    errors.nama_kandang = 'Nama kandang wajib diisi.'
  } else if (values.nama_kandang.trim().length < 2) {
    errors.nama_kandang = 'Nama kandang minimal 2 karakter.'
  }

  if (!values.tanggal_mulai || !values.tanggal_mulai.trim()) {
    errors.tanggal_mulai = 'Tanggal mulai siklus wajib dipilih.'
  }

  const jumlahAwalNum = parseFloat(values.jumlah_awal)
  if (values.jumlah_awal === '' || values.jumlah_awal === null || values.jumlah_awal === undefined) {
    errors.jumlah_awal = 'Populasi awal ayam wajib diisi.'
  } else if (isNaN(jumlahAwalNum) || jumlahAwalNum <= 0 || !Number.isInteger(jumlahAwalNum)) {
    errors.jumlah_awal = 'Populasi awal ayam harus berupa bilangan bulat positif (> 0).'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

// Helper validasi murni formulir mortalitas (Client-side Inline Validation)
export function validateMortalitasForm(values, selectedKandang = null, isEdit = false, selectedMortalitas = null) {
  const errors = {}

  if (!isEdit && (!values.kandang_id || String(values.kandang_id).trim() === '')) {
    errors.kandang_id = 'Pilih salah satu kandang aktif.'
  }

  if (!values.tanggal || !values.tanggal.trim()) {
    errors.tanggal = 'Tanggal kematian wajib dipilih.'
  }

  const jumlahNum = parseFloat(values.jumlah)
  if (values.jumlah === '' || values.jumlah === null || values.jumlah === undefined) {
    errors.jumlah = 'Jumlah kematian ayam wajib diisi.'
  } else if (isNaN(jumlahNum) || jumlahNum <= 0 || !Number.isInteger(jumlahNum)) {
    errors.jumlah = 'Jumlah kematian harus berupa bilangan bulat lebih dari 0 ekor.'
  } else if (!isEdit && selectedKandang) {
    if (jumlahNum > selectedKandang.jumlah_saat_ini) {
      errors.jumlah = `Jumlah kematian (${jumlahNum} ekor) melebihi populasi saat ini (${selectedKandang.jumlah_saat_ini} ekor).`
    }
  } else if (isEdit && selectedMortalitas && selectedKandang) {
    const maxAllowed = selectedKandang.jumlah_saat_ini + selectedMortalitas.jumlah
    if (jumlahNum > maxAllowed) {
      errors.jumlah = `Koreksi kematian (${jumlahNum} ekor) melebihi batas maksimum penyesuaian populasi (${maxAllowed} ekor).`
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export function KandangPage() {
  const [kandangList, setKandangList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [filterStatus, setFilterStatus] = useState('semua')

  // Inline Validation States
  const [createErrors, setCreateErrors] = useState({})
  const [editErrors, setEditErrors] = useState({})
  const [mortalitasErrors, setMortalitasErrors] = useState({})
  const [editMortalitasErrors, setEditMortalitasErrors] = useState({})
  const [modalGeneralError, setModalGeneralError] = useState('')

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMortalitasModal, setShowMortalitasModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showEditMortalitasModal, setShowEditMortalitasModal] = useState(false)
  const [showDeleteMortalitasModal, setShowDeleteMortalitasModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form Create Kandang State
  const [createForm, setCreateForm] = useState({
    nama_kandang: '',
    tanggal_mulai: formatLocalDate(),
    jumlah_awal: '',
  })

  // Form Edit Kandang State
  const [selectedKandang, setSelectedKandang] = useState(null)
  const [editForm, setEditForm] = useState({
    nama_kandang: '',
    tanggal_mulai: '',
    status: 'aktif',
    jumlah_awal: '',
  })

  // Form Mortalitas State
  const [mortalitasForm, setMortalitasForm] = useState({
    kandang_id: '',
    tanggal: formatLocalDate(),
    jumlah: '',
    keterangan: '',
  })

  // Edit Mortalitas State
  const [selectedMortalitas, setSelectedMortalitas] = useState(null)
  const [editMortalitasForm, setEditMortalitasForm] = useState({
    tanggal: '',
    jumlah: '',
    keterangan: '',
  })

  // History Mortalitas State
  const [historyList, setHistoryList] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyKandangObj, setHistoryKandangObj] = useState(null)

  const loadKandang = async () => {
    setLoading(true)
    setError('')
    try {
      const statusParam = filterStatus === 'semua' ? null : filterStatus
      const data = await getKandangList(statusParam)
      setKandangList(data)
    } catch (err) {
      setError(err.message || 'Gagal memuat data kandang.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKandang()
  }, [filterStatus])

  // Open Create Modal
  const openCreateModal = () => {
    setError('')
    setSuccessMsg('')
    setCreateErrors({})
    setModalGeneralError('')
    setCreateForm({
      nama_kandang: '',
      tanggal_mulai: formatLocalDate(),
      jumlah_awal: '',
    })
    setShowCreateModal(true)
  }

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setModalGeneralError('')
    setError('')
    setSuccessMsg('')

    // Client-side pure validation
    const { isValid, errors } = validateKandangForm(createForm, false)
    if (!isValid) {
      setCreateErrors(errors)
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        nama_kandang: createForm.nama_kandang.trim(),
        tanggal_mulai: createForm.tanggal_mulai,
        jumlah_awal: parseInt(createForm.jumlah_awal, 10),
      }

      await createKandang(payload)
      setSuccessMsg(`Kandang '${payload.nama_kandang}' berhasil dibuat!`)
      setShowCreateModal(false)
      setCreateErrors({})
      setCreateForm({
        nama_kandang: '',
        tanggal_mulai: formatLocalDate(),
        jumlah_awal: '',
      })
      await loadKandang()
    } catch (err) {
      setModalGeneralError(err.message || 'Gagal membuat kandang baru.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (kandang) => {
    setSelectedKandang(kandang)
    setEditErrors({})
    setModalGeneralError('')
    setEditForm({
      nama_kandang: kandang.nama_kandang,
      tanggal_mulai: kandang.tanggal_mulai,
      status: kandang.status,
      jumlah_awal: String(kandang.jumlah_awal),
    })
    setShowEditModal(true)
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedKandang) return

    setModalGeneralError('')
    setError('')
    setSuccessMsg('')

    // Client-side pure validation
    const { isValid, errors } = validateKandangForm(editForm, true, selectedKandang)
    if (!isValid) {
      setEditErrors(errors)
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        nama_kandang: editForm.nama_kandang.trim(),
        tanggal_mulai: editForm.tanggal_mulai,
        status: editForm.status,
        jumlah_awal: parseInt(editForm.jumlah_awal, 10),
      }

      await updateKandang(selectedKandang.id, payload)
      setSuccessMsg(`Data kandang '${payload.nama_kandang}' berhasil diperbarui! Populasi saat ini disinkronkan otomatis.`)
      setShowEditModal(false)
      setEditErrors({})
      await loadKandang()
    } catch (err) {
      setModalGeneralError(err.message || 'Gagal memperbarui data kandang.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Mortalitas Modal
  const openMortalitasModal = (kandang = null) => {
    setError('')
    setSuccessMsg('')
    setMortalitasErrors({})
    setModalGeneralError('')
    const activeKandang = kandangList.filter((k) => k.status === 'aktif')
    const defaultId = kandang ? String(kandang.id) : activeKandang.length > 0 ? String(activeKandang[0].id) : ''
    setMortalitasForm({
      kandang_id: defaultId,
      tanggal: formatLocalDate(),
      jumlah: '',
      keterangan: '',
    })
    setShowMortalitasModal(true)
  }

  // Handle Mortalitas Submit
  const handleMortalitasSubmit = async (e) => {
    e.preventDefault()
    setModalGeneralError('')
    setError('')
    setSuccessMsg('')

    const selectedK = kandangList.find((k) => k.id === parseInt(mortalitasForm.kandang_id, 10))
    const { isValid, errors } = validateMortalitasForm(mortalitasForm, selectedK, false)
    if (!isValid) {
      setMortalitasErrors(errors)
      return
    }

    setSubmitting(true)

    try {
      const jumlahMati = parseInt(mortalitasForm.jumlah, 10)
      const payload = {
        kandang_id: selectedK.id,
        tanggal: mortalitasForm.tanggal,
        jumlah: jumlahMati,
        keterangan: mortalitasForm.keterangan.trim() || undefined,
      }

      await createMortalitas(payload)
      setSuccessMsg(`Mortalitas ${jumlahMati} ekor pada '${selectedK.nama_kandang}' berhasil dicatat! Populasi ter-update otomatis.`)
      setShowMortalitasModal(false)
      setMortalitasErrors({})
      await loadKandang()
    } catch (err) {
      setModalGeneralError(err.message || 'Gagal mencatat mortalitas.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open History Modal
  const openHistoryModal = async (kandang = null) => {
    setShowHistoryModal(true)
    setLoadingHistory(true)
    setHistoryList([])
    setHistoryKandangObj(kandang)
    try {
      if (kandang) {
        const data = await getMortalitasByKandang(kandang.id)
        setHistoryList(data)
      } else {
        const data = await getAllMortalitas()
        setHistoryList(data)
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat riwayat mortalitas.')
    } finally {
      setLoadingHistory(false)
    }
  }

  const reloadHistory = async () => {
    if (historyKandangObj) {
      const data = await getMortalitasByKandang(historyKandangObj.id)
      setHistoryList(data)
    } else {
      const data = await getAllMortalitas()
      setHistoryList(data)
    }
  }

  // Open Edit Mortalitas Modal
  const openEditMortalitasModal = (item) => {
    setSelectedMortalitas(item)
    setEditMortalitasErrors({})
    setModalGeneralError('')
    setEditMortalitasForm({
      tanggal: item.tanggal,
      jumlah: String(item.jumlah),
      keterangan: item.keterangan || '',
    })
    setShowEditMortalitasModal(true)
  }

  // Handle Edit Mortalitas Submit
  const handleEditMortalitasSubmit = async (e) => {
    e.preventDefault()
    if (!selectedMortalitas) return

    setModalGeneralError('')
    setError('')
    setSuccessMsg('')

    const kandangOfMortalitas =
      kandangList.find((k) => k.id === selectedMortalitas.kandang_id) || historyKandangObj

    const { isValid, errors } = validateMortalitasForm(
      editMortalitasForm,
      kandangOfMortalitas,
      true,
      selectedMortalitas
    )
    if (!isValid) {
      setEditMortalitasErrors(errors)
      return
    }

    setSubmitting(true)

    try {
      const jumlahBaru = parseInt(editMortalitasForm.jumlah, 10)
      const payload = {
        tanggal: editMortalitasForm.tanggal,
        jumlah: jumlahBaru,
        keterangan: editMortalitasForm.keterangan.trim() || undefined,
      }

      await updateMortalitas(selectedMortalitas.id, payload)
      setSuccessMsg(`Catatan mortalitas #${selectedMortalitas.id} berhasil dikoreksi! Populasi kandang disinkronisasi otomatis via Atomic Delta.`)
      setShowEditMortalitasModal(false)
      setEditMortalitasErrors({})
      await reloadHistory()
      await loadKandang()
    } catch (err) {
      setModalGeneralError(err.message || 'Gagal mengoreksi data mortalitas.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Delete Confirmation Modal
  const openDeleteMortalitasModal = (item) => {
    setSelectedMortalitas(item)
    setShowDeleteMortalitasModal(true)
  }

  // Handle Delete Mortalitas Confirm
  const handleDeleteMortalitasConfirm = async () => {
    if (!selectedMortalitas) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const res = await deleteMortalitas(selectedMortalitas.id)
      setSuccessMsg(res.message || `Data mortalitas #${selectedMortalitas.id} berhasil dibatalkan dan stok dikembalikan!`)
      setShowDeleteMortalitasModal(false)
      await reloadHistory()
      await loadKandang()
    } catch (err) {
      setError(err.message || 'Gagal membatalkan data mortalitas.')
    } finally {
      setSubmitting(false)
    }
  }

  // Stats calculation
  const totalKandang = kandangList.length
  const totalAktif = kandangList.filter((k) => k.status === 'aktif').length
  const totalAyamHidup = kandangList
    .filter((k) => k.status === 'aktif')
    .reduce((acc, curr) => acc + curr.jumlah_saat_ini, 0)
  const totalKematianAkumulasi = kandangList.reduce(
    (acc, curr) => acc + Math.max(0, curr.jumlah_awal - curr.jumlah_saat_ini),
    0
  )

  const activeKandangList = kandangList.filter((k) => k.status === 'aktif')
  const currentSelectedMortalitasKandang = activeKandangList.find(
    (k) => k.id === parseInt(mortalitasForm.kandang_id, 10)
  )

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <PageHeader
        title="Manajemen Kandang & Populasi"
        subtitle="Setup kandang awal, catat & koreksi mortalitas harian (Atomic Delta/Reversal), dan pantau populasi ayam aktif."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openHistoryModal(null)}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary font-bold text-xs border border-border-subtle transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <History className="w-4 h-4 text-content-secondary" />
              <span>Riwayat Kematian</span>
            </button>

            <button
              onClick={() => openMortalitasModal(null)}
              disabled={activeKandangList.length === 0}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>Catat Mati</span>
            </button>

            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kandang</span>
            </button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-content-secondary">Total Kandang</p>
            <p className="text-xl sm:text-2xl font-black text-content-primary mt-1 font-mono">
              {totalKandang}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-content-secondary">Kandang Aktif</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 font-mono">
              {totalAktif}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-content-secondary">Populasi Hidup</p>
            <p className="text-xl sm:text-2xl font-black text-content-primary mt-1 font-mono">
              {formatNumber(totalAyamHidup)}{' '}
              <span className="text-xs text-content-muted font-normal">ekor</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-content-secondary">Total Kematian</p>
            <p className="text-xl sm:text-2xl font-black text-rose-700 mt-1 font-mono">
              {formatNumber(totalKematianAkumulasi)}{' '}
              <span className="text-xs text-content-muted font-normal">ekor</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <Skull className="w-5 h-5" />
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

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-surface-muted border border-border-subtle text-xs font-bold">
          <button
            onClick={() => setFilterStatus('semua')}
            className={`px-3 py-2 min-h-[44px] rounded-lg transition cursor-pointer ${filterStatus === 'semua'
                ? 'bg-white text-content-primary shadow-xs'
                : 'text-content-secondary hover:text-content-primary'
              }`}
          >
            Semua ({totalKandang})
          </button>
          <button
            onClick={() => setFilterStatus('aktif')}
            className={`px-3 py-2 min-h-[44px] rounded-lg transition cursor-pointer ${filterStatus === 'aktif'
                ? 'bg-white text-brand shadow-xs'
                : 'text-content-secondary hover:text-content-primary'
              }`}
          >
            Aktif ({totalAktif})
          </button>
          <button
            onClick={() => setFilterStatus('afkir')}
            className={`px-3 py-2 min-h-[44px] rounded-lg transition cursor-pointer ${filterStatus === 'afkir'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-content-secondary hover:text-content-primary'
              }`}
          >
            Afkir ({totalKandang - totalAktif})
          </button>
        </div>

        <button
          onClick={loadKandang}
          title="Refresh Data"
          className="p-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 border border-border-subtle text-content-secondary hover:text-content-primary transition cursor-pointer flex items-center justify-center"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-content-muted">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm font-medium">Memuat data kandang...</p>
        </div>
      ) : kandangList.length === 0 ? (
        <EmptyState
          icon={<Home className="w-8 h-8 text-brand" />}
          title="Belum Ada Data Kandang"
          description={
            filterStatus !== 'semua'
              ? `Tidak ditemukan kandang dengan status '${filterStatus}'.`
              : 'Mulai dengan menambahkan data setup kandang pertama Anda.'
          }
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Tambah Kandang Sekarang
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {kandangList.map((kandang) => {
            const survivalRate =
              kandang.jumlah_awal > 0
                ? ((kandang.jumlah_saat_ini / kandang.jumlah_awal) * 100).toFixed(1)
                : 0
            const totalMatiKandang = Math.max(0, kandang.jumlah_awal - kandang.jumlah_saat_ini)
            const isAktif = kandang.status === 'aktif'

            return (
              <Card
                key={kandang.id}
                className="p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[11px] font-mono text-content-muted">ID #{kandang.id}</span>
                      <h4 className="font-bold text-content-primary text-lg leading-snug">
                        {kandang.nama_kandang}
                      </h4>
                    </div>
                    <Badge variant={isAktif ? 'success' : 'warning'} size="sm">
                      {isAktif ? 'AKTIF' : 'AFKIR'}
                    </Badge>
                  </div>

                  <div className="space-y-2.5 text-xs text-content-secondary my-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-content-muted" /> Tanggal Mulai:
                      </span>
                      <span className="font-semibold text-content-primary">
                        {formatDisplayDate(kandang.tanggal_mulai)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-content-muted" /> Populasi Awal:
                      </span>
                      <span className="font-mono font-bold text-content-primary">
                        {formatNumber(kandang.jumlah_awal)} ekor
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-brand" /> Populasi Hidup:
                      </span>
                      <span className="font-mono font-black text-emerald-700 text-sm">
                        {formatNumber(kandang.jumlah_saat_ini)} ekor
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-rose-700">
                        <TrendingDown className="w-3.5 h-3.5" /> Total Kematian:
                      </span>
                      <span className="font-mono font-bold text-rose-700">
                        {formatNumber(totalMatiKandang)} ekor
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Survival */}
                  <div className="space-y-1.5 mt-3 pt-3 border-t border-border-subtle">
                    <div className="flex items-center justify-between text-xs text-content-secondary">
                      <span>Kelangsungan Hidup:</span>
                      <span className="font-mono font-bold text-content-primary">{survivalRate}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden border border-border-subtle">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${survivalRate > 90 ? 'bg-emerald-500' : survivalRate > 75 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                        style={{ width: `${Math.min(100, Math.max(0, survivalRate))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-border-subtle flex items-center justify-between gap-2">
                  <button
                    onClick={() => openHistoryModal(kandang)}
                    title="Lihat riwayat kematian kandang ini"
                    className="p-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-content-secondary hover:text-content-primary text-xs border border-border-subtle transition cursor-pointer flex items-center justify-center"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    {isAktif && (
                      <button
                        onClick={() => openMortalitasModal(kandang)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 border border-rose-200 transition cursor-pointer"
                      >
                        <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                        <span>Catat Mati</span>
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(kandang)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-xs font-bold text-content-primary border border-border-subtle transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-brand" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ADAPTIVE MODAL: Tambah Kandang Baru */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Setup Kandang Baru"
        subtitle="Inisialisasi kandang dan populasi awal masuk ayam."
        icon={<Home className="w-5 h-5 text-brand" />}
        maxWidth="max-w-md"
      >
        <form noValidate onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {/* Modal-scoped General Error Banner */}
          {modalGeneralError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 font-medium">{modalGeneralError}</div>
            </div>
          )}

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
              Nama Kandang *
            </label>
            <input
              type="text"
              placeholder="Contoh: Kandang A1 / Kandang Layer Barat"
              value={createForm.nama_kandang}
              onChange={(e) => {
                setCreateForm({ ...createForm, nama_kandang: e.target.value })
                if (createErrors.nama_kandang) {
                  setCreateErrors((prev) => ({ ...prev, nama_kandang: undefined }))
                }
              }}
              className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 text-sm transition ${createErrors.nama_kandang
                  ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-200'
                  : 'bg-surface-page border-border-subtle focus:ring-brand'
                }`}
            />
            {createErrors.nama_kandang && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>{createErrors.nama_kandang}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
              Tanggal Mulai Siklus *
            </label>
            <input
              type="date"
              value={createForm.tanggal_mulai}
              onChange={(e) => {
                setCreateForm({ ...createForm, tanggal_mulai: e.target.value })
                if (createErrors.tanggal_mulai) {
                  setCreateErrors((prev) => ({ ...prev, tanggal_mulai: undefined }))
                }
              }}
              className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border text-content-primary focus:outline-none focus:ring-2 text-sm transition ${createErrors.tanggal_mulai
                  ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-200'
                  : 'bg-surface-page border-border-subtle focus:ring-brand'
                }`}
            />
            {createErrors.tanggal_mulai && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>{createErrors.tanggal_mulai}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
              Populasi Ayam Awal (Ekor) *
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Contoh: 1000"
              value={createForm.jumlah_awal}
              onChange={(e) => {
                setCreateForm({ ...createForm, jumlah_awal: e.target.value })
                if (createErrors.jumlah_awal) {
                  setCreateErrors((prev) => ({ ...prev, jumlah_awal: undefined }))
                }
              }}
              className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 text-sm font-mono transition ${createErrors.jumlah_awal
                  ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-200'
                  : 'bg-surface-page border-border-subtle focus:ring-brand'
                }`}
            />
            {createErrors.jumlah_awal ? (
              <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>{createErrors.jumlah_awal}</span>
              </p>
            ) : (
              <p className="text-[11px] text-content-secondary mt-1">
                *Populasi saat ini otomatis diset sama dengan jumlah awal.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
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
              <span>Simpan Kandang</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ADAPTIVE MODAL: Edit Data Kandang */}
      {selectedKandang && (() => {
        const totalMati = Math.max(0, selectedKandang.jumlah_awal - selectedKandang.jumlah_saat_ini)
        const inputAwal = parseInt(editForm.jumlah_awal, 10)
        const estimasiPopulasiBaru = !isNaN(inputAwal) ? inputAwal - totalMati : null
        const isUnderflow = !isNaN(inputAwal) && inputAwal < totalMati

        return (
          <Modal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            title={`Edit Kandang #${selectedKandang.id}`}
            subtitle="Perbarui data kandang dan kalkulasi ulang populasi awal."
            icon={<Edit2 className="w-5 h-5 text-brand" />}
            maxWidth="max-w-md"
          >
            <form noValidate onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Modal-scoped General Error Banner */}
              {modalGeneralError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1 font-medium">{modalGeneralError}</div>
                </div>
              )}

              <div>
                <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
                  Nama Kandang *
                </label>
                <input
                  type="text"
                  value={editForm.nama_kandang}
                  onChange={(e) => {
                    setEditForm({ ...editForm, nama_kandang: e.target.value })
                    if (editErrors.nama_kandang) {
                      setEditErrors((prev) => ({ ...prev, nama_kandang: undefined }))
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border text-content-primary text-sm focus:outline-none focus:ring-2 transition ${editErrors.nama_kandang
                      ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-200'
                      : 'bg-surface-page border-border-subtle focus:ring-brand'
                    }`}
                />
                {editErrors.nama_kandang && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{editErrors.nama_kandang}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
                  Tanggal Mulai *
                </label>
                <input
                  type="date"
                  value={editForm.tanggal_mulai}
                  onChange={(e) => {
                    setEditForm({ ...editForm, tanggal_mulai: e.target.value })
                    if (editErrors.tanggal_mulai) {
                      setEditErrors((prev) => ({ ...prev, tanggal_mulai: undefined }))
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border text-content-primary text-sm focus:outline-none focus:ring-2 transition ${editErrors.tanggal_mulai
                      ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-200'
                      : 'bg-surface-page border-border-subtle focus:ring-brand'
                    }`}
                />
                {editErrors.tanggal_mulai && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{editErrors.tanggal_mulai}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
                  Status Operasional *
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-page border border-border-subtle text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand font-semibold"
                >
                  <option value="aktif">Aktif (Sedang Berproduksi)</option>
                  <option value="afkir">Afkir (Selesai Siklus)</option>
                </select>
              </div>

              <div>
                <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
                  Koreksi Jumlah Awal (Populasi Masuk Awal) *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editForm.jumlah_awal}
                  onChange={(e) => {
                    setEditForm({ ...editForm, jumlah_awal: e.target.value })
                    if (editErrors.jumlah_awal) {
                      setEditErrors((prev) => ({ ...prev, jumlah_awal: undefined }))
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-page border text-content-primary text-sm font-mono focus:outline-none focus:ring-2 transition ${editErrors.jumlah_awal || isUnderflow
                      ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-200'
                      : 'border-border-subtle focus:ring-brand'
                    }`}
                />
                {editErrors.jumlah_awal && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{editErrors.jumlah_awal}</span>
                  </p>
                )}
                <p className="text-[11px] text-content-secondary mt-1.5 leading-relaxed">
                  💡 Mengubah jumlah awal akan otomatis menghitung ulang populasi saat ini berdasarkan seluruh catatan kematian.
                </p>
              </div>

              {/* Informative Summary */}
              <div className="p-3.5 rounded-xl bg-surface-muted border border-border-subtle space-y-2 text-xs">
                <div className="flex items-center justify-between text-content-secondary">
                  <span>Total Kematian Tercatat:</span>
                  <span className="font-bold text-rose-700 font-mono">
                    {formatNumber(totalMati)} ekor
                  </span>
                </div>
                <div className="flex items-center justify-between text-content-secondary pt-1.5 border-t border-border-subtle">
                  <span>Estimasi Populasi Hidup Baru:</span>
                  <span
                    className={`font-black font-mono ${isUnderflow
                        ? 'text-rose-700'
                        : estimasiPopulasiBaru !== null
                          ? 'text-emerald-700'
                          : 'text-content-muted'
                      }`}
                  >
                    {estimasiPopulasiBaru !== null ? `${formatNumber(estimasiPopulasiBaru)} ekor` : '-'}
                  </span>
                </div>
              </div>

              {isUnderflow && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    Jumlah awal baru ({inputAwal} ekor) tidak boleh lebih kecil dari total kematian ({totalMati} ekor).
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
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
                  disabled={submitting || isUnderflow}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </Modal>
        )
      })()}

      {/* ADAPTIVE MODAL: Catat Mortalitas Baru */}
      <Modal
        isOpen={showMortalitasModal}
        onClose={() => setShowMortalitasModal(false)}
        title="Catat Kematian Ayam"
        subtitle="Pengurangan populasi langsung pada kandang terkait."
        icon={<TrendingDown className="w-5 h-5 text-rose-600" />}
        maxWidth="max-w-md"
      >
        <form noValidate onSubmit={handleMortalitasSubmit} className="space-y-4 text-xs">
          {/* Modal-scoped General Error Banner */}
          {modalGeneralError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 font-medium">{modalGeneralError}</div>
            </div>
          )}

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
              Pilih Kandang Aktif *
            </label>
            <select
              value={mortalitasForm.kandang_id}
              onChange={(e) => {
                setMortalitasForm({ ...mortalitasForm, kandang_id: e.target.value })
                if (mortalitasErrors.kandang_id) {
                  setMortalitasErrors((prev) => ({ ...prev, kandang_id: undefined }))
                }
              }}
              className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border text-content-primary text-sm focus:outline-none focus:ring-2 font-semibold transition ${mortalitasErrors.kandang_id
                  ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-200'
                  : 'bg-surface-page border-border-subtle focus:ring-rose-500'
                }`}
            >
              <option value="">-- Pilih Kandang Aktif --</option>
              {activeKandangList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kandang} (Populasi: {formatNumber(k.jumlah_saat_ini)} ekor)
                </option>
              ))}
            </select>
            {mortalitasErrors.kandang_id && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>{mortalitasErrors.kandang_id}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
              Tanggal Kematian *
            </label>
            <input
              type="date"
              value={mortalitasForm.tanggal}
              onChange={(e) => {
                setMortalitasForm({ ...mortalitasForm, tanggal: e.target.value })
                if (mortalitasErrors.tanggal) {
                  setMortalitasErrors((prev) => ({ ...prev, tanggal: undefined }))
                }
              }}
              className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border text-content-primary text-sm focus:outline-none focus:ring-2 transition ${mortalitasErrors.tanggal
                  ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-200'
                  : 'bg-surface-page border-border-subtle focus:ring-rose-500'
                }`}
            />
            {mortalitasErrors.tanggal && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>{mortalitasErrors.tanggal}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
              Jumlah Kematian (Ekor) *
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Contoh: 3"
              value={mortalitasForm.jumlah}
              onChange={(e) => {
                setMortalitasForm({ ...mortalitasForm, jumlah: e.target.value })
                if (mortalitasErrors.jumlah) {
                  setMortalitasErrors((prev) => ({ ...prev, jumlah: undefined }))
                }
              }}
              className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border text-content-primary text-sm font-mono focus:outline-none focus:ring-2 transition ${mortalitasErrors.jumlah
                  ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-200'
                  : 'bg-surface-page border-border-subtle focus:ring-rose-500'
                }`}
            />
            {mortalitasErrors.jumlah ? (
              <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>{mortalitasErrors.jumlah}</span>
              </p>
            ) : currentSelectedMortalitasKandang ? (
              <p className="text-[11px] text-content-secondary mt-1">
                *Maksimum input: {formatNumber(currentSelectedMortalitasKandang.jumlah_saat_ini)} ekor.
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
              Keterangan / Diagnosa <span className="text-content-muted font-normal">(Opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Misal: Sakit CRD, Heat Stress, Kanibalisme"
              value={mortalitasForm.keterangan}
              onChange={(e) => setMortalitasForm({ ...mortalitasForm, keterangan: e.target.value })}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-page border border-border-subtle text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setShowMortalitasModal(false)}
              disabled={submitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary font-bold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Simpan Kematian</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ADAPTIVE MODAL: Riwayat Mortalitas */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Riwayat Kematian: ${historyKandangObj ? historyKandangObj.nama_kandang : 'Seluruh Kandang'}`}
        subtitle="Log catatan kematian ayam. Koreksi via Delta atau batalkan via Reversal."
        icon={<History className="w-5 h-5 text-rose-600" />}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-content-muted">
              <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
              <p className="text-xs font-medium">Memuat riwayat...</p>
            </div>
          ) : historyList.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8 text-slate-400" />}
              title="Belum Ada Catatan Kematian"
              description="Tidak ditemukan catatan mortalitas untuk kandang ini."
            />
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block border border-border-subtle rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs text-content-primary">
                  <thead className="bg-surface-muted text-content-secondary uppercase tracking-wider text-[10px] font-bold border-b border-border-subtle">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3 text-right">Jumlah Mati</th>
                      <th className="px-4 py-3">Keterangan / Diagnosa</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {historyList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-bold text-content-primary">
                          {formatDisplayDate(item.tanggal)}
                        </td>
                        <td className="px-4 py-3 text-right font-black font-mono text-rose-700">
                          {formatNumber(item.jumlah)} ekor
                        </td>
                        <td className="px-4 py-3 text-content-secondary">
                          {item.keterangan || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openEditMortalitasModal(item)}
                              title="Koreksi data kematian ini"
                              className="p-1.5 rounded-lg bg-surface-muted hover:bg-slate-200 text-content-secondary hover:text-content-primary border border-border-subtle transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openDeleteMortalitasModal(item)}
                              title="Batalkan & kembalikan stok ayam"
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD LIST */}
              <div className="md:hidden flex flex-col gap-2.5">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-border-subtle bg-white space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-content-primary">
                        {formatDisplayDate(item.tanggal)}
                      </span>
                      <span className="font-black font-mono text-rose-700">
                        {formatNumber(item.jumlah)} ekor
                      </span>
                    </div>
                    {item.keterangan && (
                      <p className="text-content-secondary bg-surface-page p-2 rounded-lg">
                        {item.keterangan}
                      </p>
                    )}
                    <div className="pt-2 border-t border-border-subtle grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditMortalitasModal(item)}
                        className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary font-bold text-xs border border-border-subtle transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-brand" />
                        <span>Koreksi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteMortalitasModal(item)}
                        className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Batalkan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
            <span className="text-content-secondary font-medium">
              Total Catatan: <strong className="text-content-primary">{historyList.length}</strong>
            </span>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary font-bold transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* ADAPTIVE MODAL: Edit Catatan Mortalitas */}
      {selectedMortalitas && (
        <Modal
          isOpen={showEditMortalitasModal}
          onClose={() => setShowEditMortalitasModal(false)}
          title={`Koreksi Mortalitas #${selectedMortalitas.id}`}
          subtitle="Sinkronisasi perubahan kematian ke populasi hidup via Atomic Delta."
          icon={<Edit2 className="w-5 h-5 text-brand" />}
          maxWidth="max-w-md"
        >
          <form noValidate onSubmit={handleEditMortalitasSubmit} className="space-y-4 text-xs">
            {/* Modal-scoped General Error Banner */}
            {modalGeneralError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1 font-medium">{modalGeneralError}</div>
              </div>
            )}

            <div>
              <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
                Tanggal Kematian *
              </label>
              <input
                type="date"
                value={editMortalitasForm.tanggal}
                onChange={(e) => {
                  setEditMortalitasForm({ ...editMortalitasForm, tanggal: e.target.value })
                  if (editMortalitasErrors.tanggal) {
                    setEditMortalitasErrors((prev) => ({ ...prev, tanggal: undefined }))
                  }
                }}
                className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border text-content-primary text-sm focus:outline-none focus:ring-2 transition ${editMortalitasErrors.tanggal
                    ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-200'
                    : 'bg-surface-page border-border-subtle focus:ring-brand'
                  }`}
              />
              {editMortalitasErrors.tanggal && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>{editMortalitasErrors.tanggal}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
                Jumlah Kematian (Ekor) *
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={editMortalitasForm.jumlah}
                onChange={(e) => {
                  setEditMortalitasForm({ ...editMortalitasForm, jumlah: e.target.value })
                  if (editMortalitasErrors.jumlah) {
                    setEditMortalitasErrors((prev) => ({ ...prev, jumlah: undefined }))
                  }
                }}
                className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-page border text-content-primary text-sm font-mono focus:outline-none focus:ring-2 transition ${editMortalitasErrors.jumlah
                    ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-900 focus:ring-rose-200'
                    : 'border-border-subtle focus:ring-brand'
                  }`}
              />
              {editMortalitasErrors.jumlah && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1 animate-in fade-in duration-150">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>{editMortalitasErrors.jumlah}</span>
                </p>
              )}
              <p className="text-[11px] text-content-secondary mt-1">
                *Jumlah tercatat sebelumnya: <strong>{formatNumber(selectedMortalitas.jumlah)} ekor</strong>.
              </p>
            </div>

            <div>
              <label className="block text-content-primary font-bold uppercase tracking-wider mb-1.5">
                Keterangan / Diagnosa
              </label>
              <input
                type="text"
                placeholder="Keterangan penyebab kematian"
                value={editMortalitasForm.keterangan}
                onChange={(e) => setEditMortalitasForm({ ...editMortalitasForm, keterangan: e.target.value })}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-surface-page border border-border-subtle text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setShowEditMortalitasModal(false)}
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
                <span>Simpan Koreksi Delta</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ADAPTIVE MODAL: Konfirmasi Hapus Mortalitas */}
      {selectedMortalitas && (
        <Modal
          isOpen={showDeleteMortalitasModal}
          onClose={() => setShowDeleteMortalitasModal(false)}
          title="Batalkan Catatan Kematian"
          subtitle="Pemulihan stok populasi ayam kandang via Atomic Reversal."
          icon={<RotateCcw className="w-5 h-5 text-amber-600" />}
          maxWidth="max-w-md"
        >
          <div className="space-y-3 mb-5 text-xs text-content-secondary">
            <p>
              Anda akan membatalkan catatan kematian <strong>#{selectedMortalitas.id}</strong> sejumlah{' '}
              <strong className="text-rose-700 font-bold">{formatNumber(selectedMortalitas.jumlah)} ekor</strong> (tanggal{' '}
              {formatDisplayDate(selectedMortalitas.tanggal)}).
            </p>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-medium">
              ⚠️ Sebanyak <strong>{formatNumber(selectedMortalitas.jumlah)} ekor</strong> ayam akan secara otomatis dikembalikan
              ke populasi ayam hidup di kandang terkait.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setShowDeleteMortalitasModal(false)}
              disabled={submitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-muted hover:bg-slate-200 text-content-primary font-bold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteMortalitasConfirm}
              disabled={submitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Batalkan & Kembalikan Stok</span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default KandangPage
