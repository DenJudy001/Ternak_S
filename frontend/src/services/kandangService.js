import { getAuthHeaders } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Mengambil daftar kandang (opsional filter status: 'aktif' atau 'afkir')
 */
export async function getKandangList(statusFilter = null) {
  let url = `${API_BASE_URL}/api/v1/kandang/`
  if (statusFilter) {
    url += `?status=${encodeURIComponent(statusFilter)}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal memuat daftar kandang.')
  }

  return response.json()
}

/**
 * Mengambil detail satu kandang berdasarkan ID
 */
export async function getKandangDetail(kandangId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/kandang/${kandangId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal memuat detail kandang.')
  }

  return response.json()
}

/**
 * Membuat kandang baru
 * payload: { nama_kandang, tanggal_mulai, jumlah_awal }
 */
export async function createKandang(payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/kandang/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal membuat data kandang baru.')
  }

  return response.json()
}

/**
 * Memperbarui data kandang (nama, status, atau koreksi Genesis Fact jumlah_awal)
 * payload: { nama_kandang?, tanggal_mulai?, status?, jumlah_awal? }
 */
export async function updateKandang(kandangId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/kandang/${kandangId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Gagal memperbarui data kandang.')
  }

  return response.json()
}
