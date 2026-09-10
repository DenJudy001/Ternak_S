import { getAuthHeaders } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Mengambil ringkasan eksekutif dashboard peternakan (API Aggregator).
 * Mengembalikan data HDP hari ini, Laba/Rugi MTD, Stok Telur Gudang, dan Tren 7 hari.
 * @param {string} [targetDate] - Tanggal target evaluasi (YYYY-MM-DD), opsional.
 */
export async function getDashboardSummary(targetDate) {
  const query = new URLSearchParams()
  if (targetDate) {
    query.append('target_date', targetDate)
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
