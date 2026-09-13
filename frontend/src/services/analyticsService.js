import { getAuthHeaders } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Mengambil analitik Feed Conversion Ratio (FCR)
 * @param {Object} params
 * @param {string} params.start_date - YYYY-MM-DD
 * @param {string} params.end_date - YYYY-MM-DD
 * @param {number} [params.kandang_id] - ID kandang opsional
 */
export async function getFCRAnalytics(params = {}) {
  const query = new URLSearchParams()
  if (params.start_date) query.append('start_date', params.start_date)
  if (params.end_date) query.append('end_date', params.end_date)
  if (params.kandang_id) query.append('kandang_id', params.kandang_id)

  const response = await fetch(`${API_BASE_URL}/api/v1/analytics/fcr?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memuat analitik FCR.')
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Mengambil grafik tren produksi kontinu 30 hari (zero-filling series)
 * @param {Object} params
 * @param {number} [params.days=30] - Rentang hari
 * @param {string} [params.end_date] - Tanggal akhir (YYYY-MM-DD)
 * @param {number} [params.kandang_id] - ID kandang opsional
 */
export async function getProductionTrend(params = {}) {
  const query = new URLSearchParams()
  if (params.days) query.append('days', params.days)
  if (params.end_date) query.append('end_date', params.end_date)
  if (params.kandang_id) query.append('kandang_id', params.kandang_id)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/api/v1/analytics/production-trend${queryString}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memuat tren produksi.')
    error.status = response.status
    throw error
  }

  return response.json()
}
