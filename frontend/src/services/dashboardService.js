import { getAuthHeaders } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Mengambil ringkasan eksekutif dashboard peternakan (API Aggregator).
 * Mengembalikan data HDP hari ini, Laba/Rugi MTD, Stok Telur Gudang, dan Tren n-hari.
 * @param {string} [targetDate] - Tanggal target evaluasi (YYYY-MM-DD), opsional.
 * @param {number} [trendDays=7] - Rentang hari tren (default: 7).
 */
export async function getDashboardSummary(targetDate, trendDays = 7) {
  const query = new URLSearchParams()
  if (targetDate) {
    query.append('target_date', targetDate)
  }
  if (trendDays) {
    query.append('trend_days', trendDays)
  }

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/summary${queryString}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(errorData.detail || 'Gagal memuat ringkasan dashboard.')
    error.status = response.status
    throw error
  }

  return response.json()
}
