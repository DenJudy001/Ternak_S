import { getAuthHeaders } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Mencatat transaksi pengeluaran operasional baru.
 * payload: { tanggal, kategori, nominal, keterangan?, kandang_id? }
 */
export async function createPengeluaran(payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/pengeluaran/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal mencatat pengeluaran.')
    error.status = response.status
    error.detail = errorData.detail
    throw error
  }

  return response.json()
}

/**
 * Mengambil daftar riwayat pengeluaran dengan filter.
 * params: { kategori?, kandang_id?, start_date?, end_date?, limit?, offset? }
 */
export async function getPengeluaranList(params = {}) {
  const query = new URLSearchParams()
  if (params.kategori) query.append('kategori', params.kategori)
  if (params.kandang_id !== undefined && params.kandang_id !== null && params.kandang_id !== '') {
    query.append('kandang_id', params.kandang_id)
  }
  if (params.start_date) query.append('start_date', params.start_date)
  if (params.end_date) query.append('end_date', params.end_date)
  if (params.limit !== undefined) query.append('limit', params.limit)
  if (params.offset !== undefined) query.append('offset', params.offset)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/api/v1/pengeluaran/${queryString}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memuat riwayat pengeluaran.')
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Mengambil agregasi ringkasan pengeluaran (total & breakdown kategori via SQL GROUP BY).
 * params: { start_date?, end_date?, kandang_id? }
 */
export async function getPengeluaranSummary(params = {}) {
  const query = new URLSearchParams()
  if (params.start_date) query.append('start_date', params.start_date)
  if (params.end_date) query.append('end_date', params.end_date)
  if (params.kandang_id !== undefined && params.kandang_id !== null && params.kandang_id !== '') {
    query.append('kandang_id', params.kandang_id)
  }

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/api/v1/pengeluaran/summary${queryString}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memuat ringkasan pengeluaran.')
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Mengambil detail 1 entitas pengeluaran berdasarkan ID.
 */
export async function getPengeluaranById(pengeluaranId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/pengeluaran/${pengeluaranId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memuat detail pengeluaran.')
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Memperbarui / mengoreksi data pengeluaran (PATCH).
 * payload: { tanggal?, kategori?, nominal?, keterangan?, kandang_id? }
 */
export async function updatePengeluaran(pengeluaranId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/pengeluaran/${pengeluaranId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memperbarui data pengeluaran.')
    error.status = response.status
    error.detail = errorData.detail
    throw error
  }

  return response.json()
}

/**
 * Menghapus entri pengeluaran.
 */
export async function deletePengeluaran(pengeluaranId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/pengeluaran/${pengeluaranId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal menghapus data pengeluaran.')
    error.status = response.status
    throw error
  }

  return response.json()
}
