import React from 'react'

/**
 * Shared EmptyState Component
 * Tampilan seragam saat tabel atau daftar belum memiliki rekaman data.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.icon] - Ikon ilustrasi
 * @param {string} [props.title='Belum Ada Data'] - Judul pesan kosong
 * @param {string} [props.description='Data untuk periode atau kriteria ini belum tersedia.'] - Pesan panduan
 * @param {React.ReactNode} [props.action] - Tombol aksi pertama (misal: "Catat Data Sekarang")
 * @param {string} [props.className='']
 */
export function EmptyState({
  icon,
  title = 'Belum Ada Data',
  description = 'Data untuk periode atau kriteria ini belum tersedia.',
  action,
  className = '',
}) {
  return (
    <div
      className={`p-8 text-center flex flex-col items-center justify-center bg-surface-muted/30 border border-dashed border-border-subtle rounded-xl my-4 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-white border border-border-subtle shadow-xs text-content-muted flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-content-primary mb-1">
        {title}
      </h3>
      <p className="text-xs text-content-secondary max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  )
}

export default EmptyState
