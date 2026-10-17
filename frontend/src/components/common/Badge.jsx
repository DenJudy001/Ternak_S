import React from 'react'

/**
 * Shared Semantic Badge Component
 * Indikator status semantik dengan kontras tinggi (WCAG AA).
 * Selalu menampilkan teks eksplisit atau ikon pendukung.
 *
 * @param {Object} props
 * @param {'success'|'warning'|'danger'|'neutral'|'brand'|'info'} [props.variant='neutral']
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className='']
 * @param {'sm'|'md'} [props.size='md']
 */
export function Badge({
  variant = 'neutral',
  icon,
  children,
  className = '',
  size = 'md',
  ...rest
}) {
  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    brand: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    cool: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    indigo: 'bg-purple-50 text-purple-700 border-purple-200',
  }

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }

  const activeVariant = variantStyles[variant] || variantStyles.neutral
  const activeSize = sizeStyles[size] || sizeStyles.md

  return (
    <span
      className={`inline-flex items-center justify-center font-medium border rounded-full tracking-wide ${activeVariant} ${activeSize} ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}

export default Badge
