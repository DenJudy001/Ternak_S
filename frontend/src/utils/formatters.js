/**
 * Universal Formatter Utilities (SiTernak)
 * Sentralisasi seluruh fungsi pemformatan string, angka, mata uang, dan tanggal
 * untuk mencegah duplikasi dan perbedaan representasi data di seluruh antarmuka.
 */

/**
 * Format angka ke format mata uang Rupiah Indonesia (misal: "Rp 1.250.000").
 * @param {number|string} value - Nilai nominal numerik.
 * @returns {string} String berformat Rupiah atau 'Rp 0' jika tidak valid.
 */
export function formatRupiah(value) {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return 'Rp 0'
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

/**
 * Format angka ribuan dengan pemisah titik standar Indonesia (misal: "1.250").
 * @param {number|string} value - Nilai angka.
 * @returns {string} String angka terformat ribuan atau '0'.
 */
export function formatNumber(value) {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return '0'
  }
  return new Intl.NumberFormat('id-ID').format(Number(value))
}

/**
 * Format persentase (misal: "87.5%").
 * @param {number|string} value - Nilai persentase (0-100 atau desimal).
 * @param {number} [decimals=1] - Jumlah digit desimal di belakang koma.
 * @returns {string} String persentase terformat.
 */
export function formatPercent(value, decimals = 1) {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return '0.0%'
  }
  return `${Number(value).toFixed(decimals)}%`
}

/**
 * Format tanggal lokal Indonesia fleksibel.
 * @param {string|Date} dateStr - String tanggal 'YYYY-MM-DD' atau objek Date.
 * @param {Intl.DateTimeFormatOptions} [options] - Opsi konfigurasi format tanggal.
 * @returns {string}
 */
export function formatDateIndo(dateStr, options = {}) {
  if (!dateStr) return '-'
  try {
    let dateObj
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
      dateObj = new Date(y, m - 1, d)
    } else {
      dateObj = new Date(dateStr)
    }

    if (isNaN(dateObj.getTime())) return String(dateStr)

    const defaultOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...options,
    }

    return new Intl.DateTimeFormat('id-ID', defaultOptions).format(dateObj)
  } catch {
    return String(dateStr)
  }
}

/**
 * Format tanggal ringkas (misal: "13 Okt 2026").
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDisplayDate(dateStr) {
  return formatDateIndo(dateStr, {
    weekday: undefined,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format tanggal lengkap dengan hari (misal: "Selasa, 13 Oktober 2026").
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDisplayDateLong(dateStr) {
  return formatDateIndo(dateStr, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format tanggal untuk sumbu grafik (misal: "13 Okt").
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatChartDate(dateStr) {
  return formatDateIndo(dateStr, {
    weekday: undefined,
    day: 'numeric',
    month: 'short',
    year: undefined,
  })
}

/**
 * Format bulan dan tahun (misal: "Oktober 2026").
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDisplayMonthYear(dateStr) {
  return formatDateIndo(dateStr, {
    weekday: undefined,
    day: undefined,
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format bobot dalam kilogram (misal: "12.5 kg").
 * @param {number|string} kgValue - Nilai bobot dalam kilogram.
 * @param {number} [decimals=1] - Jumlah digit desimal.
 * @returns {string}
 */
export function formatWeight(kgValue, decimals = 1) {
  if (kgValue === undefined || kgValue === null || isNaN(Number(kgValue))) {
    return '0 kg'
  }
  return `${Number(kgValue).toFixed(decimals)} kg`
}

/**
 * Format tanggal lokal ke format ISO tanggal YYYY-MM-DD (mencegah UTC drift).
 * @param {Date|string} [d=new Date()]
 * @returns {string} String tanggal 'YYYY-MM-DD'
 */
export function formatLocalDate(d = new Date()) {
  const dateObj = d instanceof Date ? d : new Date(d)
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
