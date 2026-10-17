import React from 'react'

/**
 * Shared PageHeader Component
 * Standarisasi header di setiap halaman aplikasi (Judul Halaman, Subtitle/Keterangan, Badge, dan Action Buttons).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.title - Judul utama halaman
 * @param {React.ReactNode} [props.subtitle] - Deskripsi atau petunjuk singkat
 * @param {React.ReactNode} [props.badge] - Badge informasi atau status
 * @param {React.ReactNode} [props.action] - Tombol aksi utama (misal: tombol Tambah Data)
 * @param {string} [props.className='']
 */
export function PageHeader({
  title,
  subtitle,
  badge,
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border-subtle ${className}`}
    >
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-black text-content-primary tracking-tight leading-tight">
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-content-secondary mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {action}
        </div>
      )}
    </div>
  )
}

export default PageHeader
