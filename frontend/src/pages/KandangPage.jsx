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

export function KandangPage() {
  const [kandangList, setKandangList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [filterStatus, setFilterStatus] = useState('semua')

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
    tanggal_mulai: new Date().toISOString().split('T')[0],
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
    tanggal: new Date().toISOString().split('T')[0],
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

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const payload = {
        nama_kandang: createForm.nama_kandang.trim(),
        tanggal_mulai: createForm.tanggal_mulai,
        jumlah_awal: parseInt(createForm.jumlah_awal, 10),
      }

      if (!payload.nama_kandang || !payload.tanggal_mulai || isNaN(payload.jumlah_awal) || payload.jumlah_awal <= 0) {
        throw new Error('Semua kolom wajib diisi dengan benar. Jumlah awal harus lebih dari 0.')
      }

      await createKandang(payload)
      setSuccessMsg(`Kandang '${payload.nama_kandang}' berhasil dibuat!`)
      setShowCreateModal(false)
      setCreateForm({
        nama_kandang: '',
        tanggal_mulai: new Date().toISOString().split('T')[0],
        jumlah_awal: '',
      })
      await loadKandang()
    } catch (err) {
      setError(err.message || 'Gagal membuat kandang baru.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (kandang) => {
    setSelectedKandang(kandang)
    setEditForm({
      nama_kandang: kandang.nama_kandang,
      tanggal_mulai: kandang.tanggal_mulai,
      status: kandang.status,
      jumlah_awal: kandang.jumlah_awal,
    })
    setShowEditModal(true)
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedKandang) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const payload = {
        nama_kandang: editForm.nama_kandang.trim(),
        tanggal_mulai: editForm.tanggal_mulai,
        status: editForm.status,
        jumlah_awal: parseInt(editForm.jumlah_awal, 10),
      }

      if (isNaN(payload.jumlah_awal) || payload.jumlah_awal <= 0) {
        throw new Error('Jumlah awal ayam harus berupa angka lebih dari 0.')
      }

      await updateKandang(selectedKandang.id, payload)
      setSuccessMsg(`Data kandang '${payload.nama_kandang}' berhasil diperbarui! Populasi saat ini disinkronkan otomatis.`)
      setShowEditModal(false)
      await loadKandang()
    } catch (err) {
      setError(err.message || 'Gagal memperbarui data kandang.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Mortalitas Modal
  const openMortalitasModal = (kandang = null) => {
    setError('')
    setSuccessMsg('')
    const activeKandang = kandangList.filter((k) => k.status === 'aktif')
    const defaultId = kandang ? kandang.id : activeKandang.length > 0 ? activeKandang[0].id : ''
    setMortalitasForm({
      kandang_id: defaultId,
      tanggal: new Date().toISOString().split('T')[0],
      jumlah: '',
      keterangan: '',
    })
    setShowMortalitasModal(true)
  }

  // Handle Mortalitas Submit
  const handleMortalitasSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const selectedK = kandangList.find((k) => k.id === parseInt(mortalitasForm.kandang_id, 10))
      if (!selectedK) {
        throw new Error('Pilih kandang aktif terlebih dahulu.')
      }

      const jumlahMati = parseInt(mortalitasForm.jumlah, 10)
      if (isNaN(jumlahMati) || jumlahMati <= 0) {
        throw new Error('Jumlah kematian harus berupa angka lebih dari 0.')
      }

      if (jumlahMati > selectedK.jumlah_saat_ini) {
        throw new Error(
          `Jumlah kematian (${jumlahMati} ekor) melebihi populasi saat ini (${selectedK.jumlah_saat_ini} ekor).`
        )
      }

      const payload = {
        kandang_id: selectedK.id,
        tanggal: mortalitasForm.tanggal,
        jumlah: jumlahMati,
        keterangan: mortalitasForm.keterangan.trim() || undefined,
      }

      await createMortalitas(payload)
      setSuccessMsg(`Mortalitas ${jumlahMati} ekor pada '${selectedK.nama_kandang}' berhasil dicatat! Populasi ter-update otomatis.`)
      setShowMortalitasModal(false)
      await loadKandang()
    } catch (err) {
      setError(err.message || 'Gagal mencatat mortalitas.')
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
    setEditMortalitasForm({
      tanggal: item.tanggal,
      jumlah: item.jumlah,
      keterangan: item.keterangan || '',
    })
    setShowEditMortalitasModal(true)
  }

  // Handle Edit Mortalitas Submit
  const handleEditMortalitasSubmit = async (e) => {
    e.preventDefault()
    if (!selectedMortalitas) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const jumlahBaru = parseInt(editMortalitasForm.jumlah, 10)
      if (isNaN(jumlahBaru) || jumlahBaru <= 0) {
        throw new Error('Jumlah kematian harus berupa angka lebih dari 0.')
      }

      const payload = {
        tanggal: editMortalitasForm.tanggal,
        jumlah: jumlahBaru,
        keterangan: editMortalitasForm.keterangan.trim() || undefined,
      }

      await updateMortalitas(selectedMortalitas.id, payload)
      setSuccessMsg(`Catatan mortalitas #${selectedMortalitas.id} berhasil dikoreksi! Populasi kandang disinkronisasi otomatis via Atomic Delta.`)
      setShowEditMortalitasModal(false)
      await reloadHistory()
      await loadKandang()
    } catch (err) {
      setError(err.message || 'Gagal mengoreksi data mortalitas.')
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
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Home className="w-6 h-6 text-emerald-400" />
            Manajemen Kandang & Populasi
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Setup kandang awal, catat & koreksi mortalitas harian (Atomic Delta/Reversal), dan pantau populasi ayam.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openHistoryModal(null)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>Riwayat Kematian</span>
          </button>

          <button
            onClick={() => openMortalitasModal(null)}
            disabled={activeKandangList.length === 0}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/30 transition disabled:opacity-50"
          >
            <TrendingDown className="w-4 h-4 text-rose-400" />
            <span>Catat Mortalitas</span>
          </button>

          <button
            onClick={() => {
              setError('')
              setSuccessMsg('')
              setShowCreateModal(true)
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kandang</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Kandang</p>
            <p className="text-2xl font-bold text-white mt-1">{totalKandang}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Kandang Aktif</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{totalAktif}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Populasi Hidup (Aktif)</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalAyamHidup.toLocaleString('id-ID')} <span className="text-xs text-slate-400 font-normal">ekor</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Akumulasi Kematian</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">
              {totalKematianAkumulasi.toLocaleString('id-ID')} <span className="text-xs text-slate-400 font-normal">ekor</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Skull className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setFilterStatus('semua')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterStatus === 'semua'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({totalKandang})
          </button>
          <button
            onClick={() => setFilterStatus('aktif')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterStatus === 'aktif'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Aktif ({totalAktif})
          </button>
          <button
            onClick={() => setFilterStatus('afkir')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterStatus === 'afkir'
                ? 'bg-slate-800 text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Afkir ({totalKandang - totalAktif})
          </button>
        </div>

        <button
          onClick={loadKandang}
          title="Refresh Data"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content Grid / Loading */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium">Memuat data kandang...</p>
        </div>
      ) : kandangList.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
          <Home className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-300">Belum Ada Data Kandang</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filterStatus !== 'semua'
              ? `Tidak ditemukan kandang dengan status '${filterStatus}'.`
              : 'Mulai dengan menambahkan data setup kandang pertama Anda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kandangList.map((kandang) => {
            const survivalRate =
              kandang.jumlah_awal > 0
                ? ((kandang.jumlah_saat_ini / kandang.jumlah_awal) * 100).toFixed(1)
                : 0
            const totalMatiKandang = Math.max(0, kandang.jumlah_awal - kandang.jumlah_saat_ini)
            const isAktif = kandang.status === 'aktif'

            return (
              <div
                key={kandang.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500">ID #{kandang.id}</span>
                      <h4 className="font-bold text-white text-lg leading-snug">{kandang.nama_kandang}</h4>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        isAktif
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {isAktif ? 'Aktif' : 'Afkir'}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-400 my-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" /> Tanggal Mulai:
                      </span>
                      <span className="font-medium text-slate-200">
                        {new Date(kandang.tanggal_mulai).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Users className="w-3.5 h-3.5" /> Populasi Awal:
                      </span>
                      <span className="font-medium text-slate-200">{kandang.jumlah_awal.toLocaleString('id-ID')} ekor</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Activity className="w-3.5 h-3.5" /> Populasi Saat Ini:
                      </span>
                      <span className="font-bold text-emerald-400 text-sm">
                        {kandang.jumlah_saat_ini.toLocaleString('id-ID')} ekor
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-rose-400">
                        <TrendingDown className="w-3.5 h-3.5" /> Total Kematian:
                      </span>
                      <span className="font-semibold text-rose-400">
                        {totalMatiKandang.toLocaleString('id-ID')} ekor
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Survival */}
                  <div className="space-y-1 mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Rasio Kelangsungan Hidup:</span>
                      <span className="font-semibold text-slate-200">{survivalRate}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          survivalRate > 90 ? 'bg-emerald-500' : survivalRate > 75 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, survivalRate))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openHistoryModal(kandang)}
                    title="Lihat riwayat kematian kandang ini"
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs border border-slate-700 transition"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {isAktif && (
                      <button
                        onClick={() => openMortalitasModal(kandang)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 transition"
                      >
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Catat Mati</span>
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(kandang)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL: Tambah Kandang Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white">Tambah Setup Kandang Baru</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Kandang
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kandang A1 / Kandang Layer Barat"
                  value={createForm.nama_kandang}
                  onChange={(e) => setCreateForm({ ...createForm, nama_kandang: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tanggal Mulai Siklus
                </label>
                <input
                  type="date"
                  required
                  value={createForm.tanggal_mulai}
                  onChange={(e) => setCreateForm({ ...createForm, tanggal_mulai: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Jumlah Populasi Ayam Awal (Ekor)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Contoh: 1000"
                  value={createForm.jumlah_awal}
                  onChange={(e) => setCreateForm({ ...createForm, jumlah_awal: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  *Populasi saat ini otomatis diset sama dengan jumlah awal.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Kandang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Data Kandang */}
      {showEditModal && selectedKandang && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white">Edit Kandang #{selectedKandang.id}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Kandang
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nama_kandang}
                  onChange={(e) => setEditForm({ ...editForm, nama_kandang: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  required
                  value={editForm.tanggal_mulai}
                  onChange={(e) => setEditForm({ ...editForm, tanggal_mulai: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Status Operasional
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="aktif">Aktif (Sedang Berproduksi)</option>
                  <option value="afkir">Afkir (Selesai Siklus)</option>
                </select>
              </div>

              {(() => {
                const totalMati = selectedKandang
                  ? Math.max(0, selectedKandang.jumlah_awal - selectedKandang.jumlah_saat_ini)
                  : 0
                const inputAwal = parseInt(editForm.jumlah_awal, 10)
                const estimasiPopulasiBaru = !isNaN(inputAwal) ? inputAwal - totalMati : null
                const isUnderflow = !isNaN(inputAwal) && inputAwal < totalMati

                return (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Koreksi Jumlah Awal (Populasi Masuk Awal)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editForm.jumlah_awal}
                        onChange={(e) => setEditForm({ ...editForm, jumlah_awal: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border text-white text-sm focus:outline-none focus:ring-2 ${
                          isUnderflow
                            ? 'border-rose-500 focus:ring-rose-500'
                            : 'border-slate-700 focus:ring-emerald-500'
                        }`}
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        💡 Mengubah jumlah awal akan otomatis menghitung ulang populasi saat ini berdasarkan seluruh riwayat catatan kematian.
                      </p>
                    </div>

                    {/* Read-Only Informative Summary */}
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Total Kematian Tercatat:</span>
                        <span className="font-semibold text-rose-400">
                          {totalMati.toLocaleString('id-ID')} ekor
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 pt-1.5 border-t border-slate-800/80">
                        <span>Estimasi Populasi Saat Ini (Baru):</span>
                        <span
                          className={`font-bold ${
                            isUnderflow
                              ? 'text-rose-400'
                              : estimasiPopulasiBaru !== null
                              ? 'text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {estimasiPopulasiBaru !== null
                            ? `${estimasiPopulasiBaru.toLocaleString('id-ID')} ekor`
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {isUnderflow && (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>
                          Jumlah awal baru ({inputAwal} ekor) tidak boleh lebih kecil dari total kematian tercatat ({totalMati} ekor).
                        </span>
                      </div>
                    )}
                  </>
                )
              })()}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Catat Mortalitas Baru */}
      {showMortalitasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                Catat Kematian Ayam
              </h3>
              <button
                onClick={() => setShowMortalitasModal(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMortalitasSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Pilih Kandang Aktif
                </label>
                <select
                  required
                  value={mortalitasForm.kandang_id}
                  onChange={(e) => setMortalitasForm({ ...mortalitasForm, kandang_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {activeKandangList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama_kandang} (Populasi: {k.jumlah_saat_ini} ekor)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tanggal Kematian
                </label>
                <input
                  type="date"
                  required
                  value={mortalitasForm.tanggal}
                  onChange={(e) => setMortalitasForm({ ...mortalitasForm, tanggal: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Jumlah Kematian (Ekor)
                </label>
                <input
                  type="number"
                  min="1"
                  max={currentSelectedMortalitasKandang?.jumlah_saat_ini || 99999}
                  required
                  placeholder="Contoh: 3"
                  value={mortalitasForm.jumlah}
                  onChange={(e) => setMortalitasForm({ ...mortalitasForm, jumlah: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                {currentSelectedMortalitasKandang && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    *Maksimum input: {currentSelectedMortalitasKandang.jumlah_saat_ini} ekor. Populasi kandang akan berkurang otomatis.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Keterangan / Diagnosa (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Sakit CRD, Heat Stress, Kanibalisme"
                  value={mortalitasForm.keterangan}
                  onChange={(e) => setMortalitasForm({ ...mortalitasForm, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMortalitasModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Transaksi Kematian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Riwayat Mortalitas (Base Level 1 -> z-50) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-rose-400" />
                  Riwayat Kematian: {historyKandangObj ? historyKandangObj.nama_kandang : 'Seluruh Kandang'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Catatan log kematian ayam. Anda dapat mengoreksi jumlah (Delta) atau membatalkan catatan (Reversal).
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {loadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <p className="text-xs font-medium">Memuat riwayat...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <FileText className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                  <p className="text-sm font-medium text-slate-400">Belum ada catatan kematian ayam.</p>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3 text-right">Jumlah Mati</th>
                        <th className="px-4 py-3">Keterangan / Diagnosa</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {historyList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-medium text-white">
                            {new Date(item.tanggal).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-rose-400">
                            {item.jumlah} ekor
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {item.keterangan || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openEditMortalitasModal(item)}
                                title="Koreksi data kematian ini"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openDeleteMortalitasModal(item)}
                                title="Batalkan & kembalikan stok ayam"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
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
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Total Record: <strong className="text-white">{historyList.length}</strong>
              </span>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Catatan Mortalitas (Secondary Action Level 2 -> z-[60]) */}
      {showEditMortalitasModal && selectedMortalitas && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-400" />
                Koreksi Mortalitas #{selectedMortalitas.id}
              </h3>
              <button
                onClick={() => setShowEditMortalitasModal(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditMortalitasSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tanggal Kematian
                </label>
                <input
                  type="date"
                  required
                  value={editMortalitasForm.tanggal}
                  onChange={(e) => setEditMortalitasForm({ ...editMortalitasForm, tanggal: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Jumlah Kematian (Ekor)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editMortalitasForm.jumlah}
                  onChange={(e) => setEditMortalitasForm({ ...editMortalitasForm, jumlah: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  *Jumlah tercatat sebelumnya: <strong>{selectedMortalitas.jumlah} ekor</strong>. Selisih delta akan disinkronisasi ke populasi kandang secara otomatis.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Keterangan / Diagnosa
                </label>
                <input
                  type="text"
                  placeholder="Keterangan penyebab kematian"
                  value={editMortalitasForm.keterangan}
                  onChange={(e) => setEditMortalitasForm({ ...editMortalitasForm, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditMortalitasModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Koreksi Delta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Mortalitas (Alert Dialog Level 3 -> z-[70]) */}
      {showDeleteMortalitasModal && selectedMortalitas && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                Batalkan Catatan Kematian
              </h3>
              <button
                onClick={() => setShowDeleteMortalitasModal(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300 mb-6">
              <p>
                Anda akan membatalkan catatan kematian <strong>#{selectedMortalitas.id}</strong> sejumlah{' '}
                <strong className="text-rose-400">{selectedMortalitas.jumlah} ekor</strong> (tanggal{' '}
                {new Date(selectedMortalitas.tanggal).toLocaleDateString('id-ID')}).
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                ⚠️ Sebanyak <strong>{selectedMortalitas.jumlah} ekor</strong> ayam akan secara otomatis dikembalikan
                ke populasi ayam hidup di kandang terkait.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteMortalitasModal(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteMortalitasConfirm}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Batalkan & Kembalikan Stok</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KandangPage
