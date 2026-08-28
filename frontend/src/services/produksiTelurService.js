import { getAuthHeaders } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Mencatat transaksi produksi telur harian baru.
 * payload: { kandang_id, tanggal, jumlah_butir_normal, jumlah_butir_retak, jumlah_butir_pecah, catatan? }
 */
export async function createProduksiTelur(payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/produksi-telur/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal mencatat data produksi telur.')
    error.status = response.status
    error.detail = errorData.detail
    throw error
  }

  return response.json()
}

/**
 * Mengambil detail 1 data produksi telur berdasarkan ID.
 */
export async function getProduksiTelurById(produksiId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/produksi-telur/${produksiId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal memuat detail produksi telur.')
  }

  return response.json()
}

/**
 * Memperbarui / mengoreksi data produksi telur.
 * payload: { tanggal?, jumlah_butir_normal?, jumlah_butir_retak?, jumlah_butir_pecah?, catatan? }
 */
export async function updateProduksiTelur(produksiId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/produksi-telur/${produksiId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal mengoreksi data produksi telur.')
    error.status = response.status
    error.detail = errorData.detail
    throw error
  }

  return response.json()
}

/**
 * Menghapus data produksi telur.
 */
export async function deleteProduksiTelur(produksiId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/produksi-telur/${produksiId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal menghapus data produksi telur.')
  }

  return response.json()
}

/**
 * Mengambil riwayat produksi telur untuk satu kandang spesifik.
 */
export async function getProduksiTelurByKandang(kandangId, limit = 100, offset = 0) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/produksi-telur/kandang/${kandangId}?limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal memuat riwayat produksi telur kandang.')
  }

  return response.json()
}

/**
 * Mengambil seluruh data produksi telur lintas kandang.
 */
export async function getAllProduksiTelur(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.startDate) searchParams.append('start_date', params.startDate)
  if (params.endDate) searchParams.append('end_date', params.endDate)
  if (params.limit) searchParams.append('limit', params.limit)
  if (params.offset) searchParams.append('offset', params.offset)

  const queryString = searchParams.toString()
  const url = `${API_BASE_URL}/api/v1/produksi-telur/${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal memuat riwayat produksi telur.')
  }

  return response.json()
}
