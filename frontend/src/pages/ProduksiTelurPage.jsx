import React, { useState, useEffect } from 'react'
import { getKandangList } from '../services/kandangService'
import {
  createProduksiTelur,
  updateProduksiTelur,
  deleteProduksiTelur,
  getAllProduksiTelur,
  getProduksiTelurByKandang,
} from '../services/produksiTelurService'
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
  HelpCircle,
  RotateCcw,
} from 'lucide-react'

export function ProduksiTelurPage() {
  const [produksiList, setProduksiList] = useState([])
  const [kandangList, setKandangList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [filterKandang, setFilterKandang] = useState('semua')

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
    tanggal: new Date().toISOString().split('T')[0],
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

  // Load Data
  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [kandangData, allProduksi] = await Promise.all([
        getKandangList('aktif'),
        getAllProduksiTelur(),
      ])
      setKandangList(kandangData)
      setProduksiList(allProduksi)
    } catch (err) {
      setError(err.message || 'Gagal memuat data produksi telur.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Open Create Modal
  const openCreateModal = (kandangId = null) => {
    setError('')
    setSuccessMsg('')
    setDuplicateConflict(null)
    const defaultKandangId =
      kandangId || (kandangList.length > 0 ? kandangList[0].id : '')
    setCreateForm({
      kandang_id: defaultKandangId,
      tanggal: new Date().toISOString().split('T')[0],
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
        // Find existing record in local list or set conflict info
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
      // Refresh list to find it
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

  // Filtered List
  const filteredList =
    filterKandang === 'semua'
      ? produksiList
      : produksiList.filter((p) => p.kandang_id === parseInt(filterKandang, 10))

  // KPI Calculations
  const totalNormal = filteredList.reduce((acc, curr) => acc + curr.jumlah_butir_normal, 0)
  const totalRetak = filteredList.reduce((acc, curr) => acc + curr.jumlah_butir_retak, 0)
  const totalPecah = filteredList.reduce((acc, curr) => acc + curr.jumlah_butir_pecah, 0)
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

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Egg className="w-6 h-6 text-amber-400" />
            Produksi Telur Harian
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Catat hasil panen telur (butir normal, retak, pecah) per kandang aktif dengan pencegahan duplikasi otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openCreateModal()}
            disabled={kandangList.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Produksi Telur</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Telur Normal</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {totalNormal.toLocaleString('id-ID')} <span className="text-xs text-slate-400 font-normal">butir</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Egg className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Telur Cangkang Retak</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {totalRetak.toLocaleString('id-ID')} <span className="text-xs text-slate-400 font-normal">butir</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Telur Rusak / Pecah</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">
              {totalPecah.toLocaleString('id-ID')} <span className="text-xs text-slate-400 font-normal">butir</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <X className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Seluruh Butir</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalSemuaButir.toLocaleString('id-ID')} <span className="text-xs text-slate-400 font-normal">butir</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="w-5 h-5" />
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

      {/* Controls & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Filter Kandang:</label>
          <select
            value={filterKandang}
            onChange={(e) => setFilterKandang(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="semua">Semua Kandang Aktif</option>
            {kandangList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_kandang}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadData}
          title="Refresh Data"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition self-end sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Production Records Table */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium">Memuat data produksi telur...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
          <Egg className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-300">Belum Ada Data Produksi Telur</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filterKandang !== 'semua'
              ? 'Belum ada catatan panen telur untuk kandang terpilih.'
              : 'Klik tombol "+ Catat Produksi Telur" untuk mulai mencatat hasil panen harian.'}
          </p>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-2xl bg-slate-900/80 overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-700">
              <tr>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Kandang</th>
                <th className="px-4 py-3.5 text-right">Butir Normal</th>
                <th className="px-4 py-3.5 text-right">Cangkang Retak</th>
                <th className="px-4 py-3.5 text-right">Pecah/Rusak</th>
                <th className="px-4 py-3.5 text-right font-bold text-white">Total Butir</th>
                <th className="px-4 py-3.5">Catatan</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredList.map((item) => {
                const kandangName =
                  kandangList.find((k) => k.id === item.kandang_id)?.nama_kandang ||
                  `Kandang #${item.kandang_id}`
                const totalItem =
                  item.jumlah_butir_normal + item.jumlah_butir_retak + item.jumlah_butir_pecah

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5 font-medium text-white">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-amber-400">
                      {kandangName}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-400">
                      {item.jumlah_butir_normal.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3.5 text-right text-amber-300">
                      {item.jumlah_butir_retak.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3.5 text-right text-rose-400">
                      {item.jumlah_butir_pecah.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-white">
                      {totalItem.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 max-w-xs truncate">
                      {item.catatan || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          title="Edit Catatan Produksi"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(item)}
                          title="Hapus Catatan Produksi"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
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
      )}

      {/* MODAL: Catat Produksi Baru (Level 1 -> z-50) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Egg className="w-5 h-5 text-amber-400" />
                Catat Produksi Telur Harian
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DUPLICATE CONFLICT WARNING BANNER (409) */}
            {duplicateConflict && (
              <div className="mb-4 p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs space-y-2.5 animate-fade-in">
                <div className="flex items-start gap-2 font-semibold text-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>Data Duplikat Terdeteksi (HTTP 409 Conflict)</span>
                </div>
                <p className="leading-relaxed">
                  Data produksi telur untuk kandang ini pada tanggal{' '}
                  <strong>{duplicateConflict.tanggal}</strong> sudah pernah dicatat. Satu kandang hanya
                  memiliki 1 catatan produksi per tanggal.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSwitchToEditFromConflict}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs shadow hover:bg-amber-400 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Buka Form Edit Data Tersebut</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateConflict(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                  >
                    Ganti Tanggal / Kandang
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Pilih Kandang
                  </label>
                  <select
                    required
                    value={createForm.kandang_id}
                    onChange={(e) => setCreateForm({ ...createForm, kandang_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {kandangList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama_kandang}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Tanggal Panen
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.tanggal}
                    onChange={(e) => setCreateForm({ ...createForm, tanggal: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Egg Categories Inputs */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3.5">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Kategori Butir Telur
                </p>

                <div>
                  <label className="block text-xs font-medium text-emerald-400 mb-1">
                    1. Jumlah Butir Normal (Kualitas Bagus) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Contoh: 850"
                    value={createForm.jumlah_butir_normal}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, jumlah_butir_normal: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-amber-300 mb-1">
                      2. Cangkang Retak
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.jumlah_butir_retak}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, jumlah_butir_retak: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-rose-400 mb-1">
                      3. Rusak / Pecah
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.jumlah_butir_pecah}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, jumlah_butir_pecah: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Akumulasi:</span>
                  <span className="font-bold text-white text-sm bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                    {createTotalLive.toLocaleString('id-ID')} butir
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Kondisi pakan, suhu cuaca, atau catatan khusus lainnya"
                  value={createForm.catatan}
                  onChange={(e) => setCreateForm({ ...createForm, catatan: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
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
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Data Produksi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Produksi Telur (Level 2 -> z-[60]) */}
      {showEditModal && selectedProduksi && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-400" />
                Koreksi Produksi Telur #{selectedProduksi.id}
              </h3>
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
                  Tanggal Panen
                </label>
                <input
                  type="date"
                  required
                  value={editForm.tanggal}
                  onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3.5">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Koreksi Kategori Butir Telur
                </p>

                <div>
                  <label className="block text-xs font-medium text-emerald-400 mb-1">
                    1. Jumlah Butir Normal *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.jumlah_butir_normal}
                    onChange={(e) =>
                      setEditForm({ ...editForm, jumlah_butir_normal: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-amber-300 mb-1">
                      2. Cangkang Retak
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.jumlah_butir_retak}
                      onChange={(e) =>
                        setEditForm({ ...editForm, jumlah_butir_retak: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-rose-400 mb-1">
                      3. Rusak / Pecah
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.jumlah_butir_pecah}
                      onChange={(e) =>
                        setEditForm({ ...editForm, jumlah_butir_pecah: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Koreksi:</span>
                  <span className="font-bold text-white text-sm bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                    {editTotalLive.toLocaleString('id-ID')} butir
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={editForm.catatan}
                  onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

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

      {/* MODAL: Konfirmasi Hapus (Level 3 -> z-[70]) */}
      {showDeleteModal && selectedProduksi && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                Hapus Data Produksi Telur
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300 mb-6">
              <p>
                Anda akan menghapus data produksi telur <strong>#{selectedProduksi.id}</strong> tanggal{' '}
                <strong>{new Date(selectedProduksi.tanggal).toLocaleDateString('id-ID')}</strong> sejumlah{' '}
                <strong className="text-amber-400">
                  {(
                    selectedProduksi.jumlah_butir_normal +
                    selectedProduksi.jumlah_butir_retak +
                    selectedProduksi.jumlah_butir_pecah
                  ).toLocaleString('id-ID')}{' '}
                  butir
                </strong>
                .
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                ⚠️ Tindakan ini akan menghapus catatan secara permanen dari basis data.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProduksiTelurPage
