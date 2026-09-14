import { getAuthHeaders } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Mengunduh laporan bulanan peternakan dalam format Excel (.xlsx)
 * @param {number} tahun - Tahun evaluasi (misal: 2026)
 * @param {number} bulan - Bulan evaluasi 1-12
 */
export async function exportMonthlyExcel(tahun, bulan) {
  const headers = getAuthHeaders()
  delete headers['Content-Type']

  const response = await fetch(
    `${API_BASE_URL}/api/v1/reports/monthly/excel?tahun=${tahun}&bulan=${bulan}`,
    {
      method: 'GET',
      headers,
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal mengunduh berkas laporan Excel.')
  }

  const blob = await response.blob()
  const filename = `Laporan_Bulanan_SiTernak_${tahun}_${String(bulan).padStart(2, '0')}.xlsx`
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(downloadUrl)
}

/**
 * Mengunduh laporan bulanan peternakan dalam format PDF (.pdf)
 * @param {number} tahun - Tahun evaluasi (misal: 2026)
 * @param {number} bulan - Bulan evaluasi 1-12
 */
export async function exportMonthlyPdf(tahun, bulan) {
  const headers = getAuthHeaders()
  delete headers['Content-Type']

  const response = await fetch(
    `${API_BASE_URL}/api/v1/reports/monthly/pdf?tahun=${tahun}&bulan=${bulan}`,
    {
      method: 'GET',
      headers,
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal mengunduh berkas laporan PDF.')
  }

  const blob = await response.blob()
  const filename = `Laporan_Bulanan_SiTernak_${tahun}_${String(bulan).padStart(2, '0')}.pdf`
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(downloadUrl)
}
