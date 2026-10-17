import React from 'react'

/**
 * Shared Card Component
 * Wrapper konsisten berlatar putih dengan border halus, sudut membulat, dan bayangan tipis.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className='']
 * @param {boolean} [props.hover=false] - Tambahkan efek interaktif hover jika kartu dapat diklik
 * @param {Function} [props.onClick]
 */
export function Card({ children, className = '', hover = false, onClick, ...rest }) {
  const hoverClasses = hover
    ? 'cursor-pointer hover:border-brand hover:shadow-md transition-all duration-200'
    : ''

  return (
    <div
      onClick={onClick}
      className={`bg-surface-card border border-border-subtle rounded-xl p-5 shadow-xs ${hoverClasses} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export default Card
