import React, { useState, useEffect } from 'react'
import {
  getKandangList,
  createKandang,
  updateKandang,
} from '../services/kandangService'
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
  const [submitting, setSubmitting] = useState(false)

  // Form Create State
  const [createForm, setCreateForm] = useState({
    nama_kandang: '',
    tanggal_mulai: new Date().toISOString().split('T')[0],
    jumlah_awal: '',
  })

  // Form Edit State
  const [selectedKandang, setSelectedKandang] = useState(null)
  const [editForm, setEditForm] = useState({
    nama_kandang: '',
    tanggal_mulai: '',
    status: 'aktif',
    jumlah_saat_ini: '',
  })

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
      jumlah_saat_ini: kandang.jumlah_saat_ini,
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
        jumlah_saat_ini: parseInt(editForm.jumlah_saat_ini, 10),
      }

      if (isNaN(payload.jumlah_saat_ini) || payload.jumlah_saat_ini < 0) {
        throw new Error('Jumlah ayam saat ini tidak boleh bernilai negatif.')
      }

      await updateKandang(selectedKandang.id, payload)
      setSuccessMsg(`Data kandang '${payload.nama_kandang}' berhasil diperbarui!`)
      setShowEditModal(false)
      await loadKandang()
    } catch (err) {
      setError(err.message || 'Gagal memperbarui data kandang.')
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

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Home className="w-6 h-6 text-emerald-400" />
            Manajemen Kandang
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Setup kandang awal, pantau populasi ayam hidup, dan kelola status siklus kandang.
          </p>
        </div>

        <button
          onClick={() => {
            setError('')
            setSuccessMsg('')
            setShowCreateModal(true)
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kandang Baru</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <p className="text-xs font-medium text-slate-400">Total Populasi Ayam Hidup</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalAyamHidup.toLocaleString('id-ID')} <span className="text-xs text-slate-400 font-normal">ekor</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Users className="w-5 h-5" />
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
          {filterStatus === 'semua' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kandang Sekarang</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kandangList.map((kandang) => {
            const survivalRate =
              kandang.jumlah_awal > 0
                ? ((kandang.jumlah_saat_ini / kandang.jumlah_awal) * 100).toFixed(1)
                : 0
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

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-end">
                  <button
                    onClick={() => openEditModal(kandang)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit & Koreksi</span>
                  </button>
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Koreksi Populasi Saat Ini (Ekor)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editForm.jumlah_saat_ini}
                  onChange={(e) => setEditForm({ ...editForm, jumlah_saat_ini: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  *Populasi awal tercatat: {selectedKandang.jumlah_awal} ekor.
                </p>
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
    </div>
  )
}

export default KandangPage
