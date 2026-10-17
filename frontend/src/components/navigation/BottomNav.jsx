import React, { useState } from 'react'
import {
  LayoutDashboard,
  Egg,
  ShoppingCart,
  Receipt,
  MoreHorizontal,
  Home,
  Boxes,
  BarChart3,
  FileSpreadsheet,
  X,
  ChevronRight,
} from 'lucide-react'

/**
 * Mobile Bottom Navigation Bar (< md)
 * Menyediakan 4 tab akses cepat utama + 1 menu popup "Lainnya" untuk efisiensi satu tangan.
 *
 * @param {Object} props
 * @param {string} props.activeTab - ID tab yang sedang aktif
 * @param {Function} props.onNavigate - Callback untuk berpindah tab
 * @param {Function} props.onOpenExportModal - Callback untuk membuka modal ekspor laporan
 */
export function BottomNav({ activeTab, onNavigate, onOpenExportModal }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const handleTabClick = (tabId) => {
    setIsMoreOpen(false)
    onNavigate(tabId)
  }

  const handleExportClick = () => {
    setIsMoreOpen(false)
    if (onOpenExportModal) {
      onOpenExportModal()
    }
  }

  const primaryTabs = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'produksi-telur', label: 'Produksi', icon: Egg },
    { id: 'penjualan', label: 'Penjualan', icon: ShoppingCart },
    { id: 'pengeluaran', label: 'Biaya', icon: Receipt },
  ]

  const isMoreActive = ['kandang', 'stok-telur', 'analitik'].includes(activeTab)

  return (
    <>
      {/* 1. Fixed Bottom Navigation Bar (< md) */}
      <nav
        aria-label="Navigasi Bawah Ponsel"
        className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border-subtle z-40 md:hidden flex items-center justify-around px-2 shadow-lg safe-bottom"
      >
        {primaryTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors cursor-pointer ${
                isActive
                  ? 'text-brand font-bold'
                  : 'text-content-muted hover:text-content-secondary'
              }`}
            >
              <div
                className={`p-1 rounded-full transition-transform ${
                  isActive ? 'scale-110 bg-brand-light' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 leading-none tracking-tight">
                {tab.label}
              </span>
            </button>
          )
        })}

        {/* Tab 5: Menu Lainnya */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors cursor-pointer ${
            isMoreActive || isMoreOpen
              ? 'text-brand font-bold'
              : 'text-content-muted hover:text-content-secondary'
          }`}
        >
          <div
            className={`p-1 rounded-full transition-transform ${
              isMoreActive || isMoreOpen ? 'scale-110 bg-brand-light' : ''
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 leading-none tracking-tight">
            Lainnya
          </span>
        </button>
      </nav>

      {/* 2. Bottom Sheet Drawer Menu "Lainnya" (< md) */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Box */}
          <div className="relative w-full bg-white rounded-t-2xl border-t border-border-subtle p-5 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200 safe-bottom">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-3">
              <div>
                <h3 className="font-bold text-sm text-content-primary">
                  Menu Operasional Lainnya
                </h3>
                <p className="text-[11px] text-content-muted">
                  Akses modul data dan laporan tambahan
                </p>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-lg text-content-muted hover:bg-slate-100 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => handleTabClick('analitik')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition cursor-pointer min-h-[44px] ${
                  activeTab === 'analitik'
                    ? 'bg-brand-light text-brand font-bold'
                    : 'text-content-primary hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold">Analitik & FCR</p>
                    <p className="text-[10px] text-content-muted">
                      Tren 30 hari & efisiensi pakan
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-content-muted" />
              </button>

              <button
                onClick={() => handleTabClick('stok-telur')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition cursor-pointer min-h-[44px] ${
                  activeTab === 'stok-telur'
                    ? 'bg-brand-light text-brand font-bold'
                    : 'text-content-primary hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold">Stok Gudang</p>
                    <p className="text-[10px] text-content-muted">
                      Mutasi & saldo telur siap jual
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-content-muted" />
              </button>

              <button
                onClick={() => handleTabClick('kandang')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition cursor-pointer min-h-[44px] ${
                  activeTab === 'kandang'
                    ? 'bg-brand-light text-brand font-bold'
                    : 'text-content-primary hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Home className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold">Manajemen Kandang</p>
                    <p className="text-[10px] text-content-muted">
                      Data populasi & pencatatan mortalitas
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-content-muted" />
              </button>

              <button
                onClick={handleExportClick}
                className="w-full flex items-center justify-between p-3 rounded-xl text-content-primary hover:bg-slate-50 transition cursor-pointer min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold">Ekspor Laporan</p>
                    <p className="text-[10px] text-content-muted">
                      Unduh rekap bulanan Excel & PDF
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-content-muted" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default BottomNav
