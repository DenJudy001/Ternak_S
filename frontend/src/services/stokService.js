import { getAuthHeaders } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Mengambil ringkasan status stok telur gudang live on-the-fly.
 * targetDate: opsional string YYYY-MM-DD
 */
export async function getStokSummary(targetDate = null) {
  const query = new URLSearchParams()
  if (targetDate) query.append('target_date', targetDate)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/api/v1/stok-telur/summary${queryString}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memuat ringkasan stok telur.')
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Mengambil riwayat buku besar (ledger) mutasi aliran masuk/keluar telur.
 * params: { start_date?, end_date? }
 */
export async function getStokMutasi(params = {}) {
  const query = new URLSearchParams()
  if (params.start_date) query.append('start_date', params.start_date)
  if (params.end_date) query.append('end_date', params.end_date)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/api/v1/stok-telur/mutasi${queryString}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memuat buku mutasi stok telur.')
    error.status = response.status
    throw error
  }

  return response.json()
}
