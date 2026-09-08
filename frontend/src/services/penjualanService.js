import { getAuthHeaders } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Mencatat transaksi penjualan telur baru.
 * payload: { tanggal, satuan_jual, kuantitas, harga_satuan, pembeli?, jumlah_butir_manual? }
 */
export async function createPenjualan(payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/penjualan/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal mencatat penjualan telur.')
    error.status = response.status
    error.detail = errorData.detail
    throw error
  }

  return response.json()
}

/**
 * Mengambil daftar riwayat penjualan dengan query filter.
 * params: { satuan_jual?, start_date?, end_date?, search_pembeli?, limit?, offset? }
 */
export async function getPenjualanList(params = {}) {
  const query = new URLSearchParams()
  if (params.satuan_jual) query.append('satuan_jual', params.satuan_jual)
  if (params.start_date) query.append('start_date', params.start_date)
  if (params.end_date) query.append('end_date', params.end_date)
  if (params.search_pembeli) query.append('search_pembeli', params.search_pembeli)
  if (params.limit !== undefined) query.append('limit', params.limit)
  if (params.offset !== undefined) query.append('offset', params.offset)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/api/v1/penjualan/${queryString}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memuat riwayat penjualan.')
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Mengambil ringkasan KPI agregasi penjualan (total pendapatan, total butir, breakdown satuan).
 * params: { start_date?, end_date? }
 */
export async function getPenjualanSummary(params = {}) {
  const query = new URLSearchParams()
  if (params.start_date) query.append('start_date', params.start_date)
  if (params.end_date) query.append('end_date', params.end_date)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/api/v1/penjualan/summary${queryString}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memuat ringkasan penjualan.')
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Mengambil detail 1 transaksi penjualan berdasarkan ID.
 */
export async function getPenjualanById(penjualanId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/penjualan/${penjualanId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memuat detail penjualan.')
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Memperbarui data transaksi penjualan secara parsial (PATCH).
 * payload: { tanggal?, satuan_jual?, kuantitas?, harga_satuan?, pembeli?, jumlah_butir_manual? }
 */
export async function updatePenjualan(penjualanId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/penjualan/${penjualanId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memperbarui data penjualan.')
    error.status = response.status
    error.detail = errorData.detail
    throw error
  }

  return response.json()
}

/**
 * Menghapus transaksi penjualan.
 */
export async function deletePenjualan(penjualanId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/penjualan/${penjualanId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal menghapus data penjualan.')
    error.status = response.status
    throw error
  }

  return response.json()
}
