import { getAuthHeaders } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Mencatat transaksi kematian ayam (mortalitas) baru.
 * Otomatis mengurangi jumlah_saat_ini di backend secara atomik.
 * payload: { kandang_id, tanggal, jumlah, keterangan? }
 */
export async function createMortalitas(payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/mortalitas/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal mencatat data mortalitas.')
  }

  return response.json()
}

/**
 * Mengambil riwayat mortalitas untuk satu kandang spesifik.
 */
export async function getMortalitasByKandang(kandangId, limit = 100, offset = 0) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/mortalitas/kandang/${kandangId}?limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal memuat riwayat mortalitas kandang.')
  }

  return response.json()
}

/**
 * Mengambil seluruh riwayat mortalitas lintas kandang.
 */
export async function getAllMortalitas(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.startDate) searchParams.append('start_date', params.startDate)
  if (params.endDate) searchParams.append('end_date', params.endDate)
  if (params.limit) searchParams.append('limit', params.limit)
  if (params.offset) searchParams.append('offset', params.offset)

  const queryString = searchParams.toString()
  const url = `${API_BASE_URL}/api/v1/mortalitas/${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal memuat riwayat mortalitas.')
  }

  return response.json()
}
