import React, { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Shared Adaptive Modal & Bottom Sheet Component
 * - Pada Desktop (>= md): Tampil sebagai Centered Modal Dialog ber-backdrop blur halus.
 * - Pada Mobile (< md): Tampil otomatis sebagai Bottom Sheet (melekat di bawah, rounded atas, max-h 90vh)
 *   lengkap dengan drag/grab indicator handle bar untuk kenyamanan satu tangan.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Status visibilitas modal
 * @param {Function} props.onClose - Callback saat modal ditutup
 * @param {React.ReactNode} [props.title] - Judul modal
 * @param {React.ReactNode} [props.subtitle] - Deskripsi atau keterangan tambahan
 * @param {React.ReactNode} [props.icon] - Ikon visual di samping judul
 * @param {React.ReactNode} props.children - Konten form atau body dialog
 * @param {string} [props.maxWidth='max-w-lg'] - Lebar maksimal pada layar desktop
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'max-w-lg',
}) {
  // Cegah scrolling pada background body saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Tutup dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200">
      {/* Backdrop click dismiss */}
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet Box */}
      <div
        className={`w-full ${maxWidth} bg-white border border-border-subtle shadow-2xl overflow-hidden
          /* Mobile Bottom Sheet Styles */
          rounded-t-2xl max-h-[92vh] flex flex-col bottom-0 animate-in slide-in-from-bottom duration-200
          /* Desktop Centered Modal Styles */
          md:rounded-2xl md:max-h-[88vh] md:m-4 md:animate-in md:fade-in md:zoom-in-95`}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Grab / Handle Bar */}
        <div className="pt-2.5 pb-1 md:hidden flex justify-center shrink-0">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Modal Header */}
        {(title || icon) && (
          <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface-muted/40">
            <div className="flex items-center gap-3 pr-2">
              {icon && (
                <div className="w-9 h-9 rounded-xl bg-brand-light text-brand flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h3 className="text-base font-bold text-content-primary leading-tight">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-content-secondary mt-0.5 leading-snug">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-slate-100 transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              aria-label="Tutup dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
