import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { KandangPage } from './pages/KandangPage'
import { ProduksiTelurPage } from './pages/ProduksiTelurPage'
import { PengeluaranPage } from './pages/PengeluaranPage'
import { PenjualanPage } from './pages/PenjualanPage'
import { StokTelurPage } from './pages/StokTelurPage'
import { DashboardPage } from './pages/DashboardPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ExportReportModal } from './components/ExportReportModal'
import { BottomNav } from './components/navigation/BottomNav'
import {
  LayoutDashboard,
  Home,
  Egg,
  Receipt,
  ShoppingCart,
  Boxes,
  BarChart3,
  FileSpreadsheet,
  LogOut,
  User as UserIcon,
} from 'lucide-react'

function MainLayout() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'kandang' | 'produksi-telur'
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface-page text-content-primary flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-border-subtle bg-white/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center space-x-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-black text-xl shadow-md shadow-brand/20">
                ST
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight tracking-tight text-content-primary flex items-center gap-2">
                  SiTernak
                </h1>
                <p className="text-[11px] text-content-secondary font-medium">Sistem Peternakan Ayam Petelur</p>
              </div>
            </div>

            {/* Navigation Tabs (Desktop >= md) */}
            <nav className="hidden md:flex items-center space-x-1 bg-surface-muted/60 p-1 rounded-xl border border-border-subtle text-xs">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-content-primary font-bold shadow-xs border border-border-subtle'
                    : 'text-content-secondary hover:text-content-primary hover:bg-white/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('analitik')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                  activeTab === 'analitik'
                    ? 'bg-white text-content-primary font-bold shadow-xs border border-border-subtle'
                    : 'text-content-secondary hover:text-content-primary hover:bg-white/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analitik</span>
              </button>

              <button
                onClick={() => setActiveTab('kandang')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                  activeTab === 'kandang'
                    ? 'bg-white text-content-primary font-bold shadow-xs border border-border-subtle'
                    : 'text-content-secondary hover:text-content-primary hover:bg-white/60'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Kandang</span>
              </button>

              <button
                onClick={() => setActiveTab('produksi-telur')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                  activeTab === 'produksi-telur'
                    ? 'bg-white text-content-primary font-bold shadow-xs border border-border-subtle'
                    : 'text-content-secondary hover:text-content-primary hover:bg-white/60'
                }`}
              >
                <Egg className="w-3.5 h-3.5" />
                <span>Produksi Telur</span>
              </button>

              <button
                onClick={() => setActiveTab('pengeluaran')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                  activeTab === 'pengeluaran'
                    ? 'bg-white text-content-primary font-bold shadow-xs border border-border-subtle'
                    : 'text-content-secondary hover:text-content-primary hover:bg-white/60'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Pengeluaran</span>
              </button>

              <button
                onClick={() => setActiveTab('penjualan')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                  activeTab === 'penjualan'
                    ? 'bg-white text-content-primary font-bold shadow-xs border border-border-subtle'
                    : 'text-content-secondary hover:text-content-primary hover:bg-white/60'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Penjualan</span>
              </button>

              <button
                onClick={() => setActiveTab('stok-telur')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                  activeTab === 'stok-telur'
                    ? 'bg-white text-content-primary font-bold shadow-xs border border-border-subtle'
                    : 'text-content-secondary hover:text-content-primary hover:bg-white/60'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Stok Gudang</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Ekspor Laporan Bulanan Button (Desktop) */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              title="Ekspor Laporan Bulanan (Excel & PDF)"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor Laporan</span>
            </button>

            {/* User profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-border-subtle">
              <div className="flex items-center gap-2 bg-surface-muted px-3 py-1.5 rounded-xl border border-border-subtle">
                <div className="w-6 h-6 rounded-full bg-brand-light text-brand flex items-center justify-center text-xs font-bold">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-content-primary leading-none">{user?.username || 'Owner'}</p>
                  <p className="text-[10px] text-brand font-medium leading-none mt-0.5">Admin</p>
                </div>
              </div>

              <button
                onClick={logout}
                title="Keluar dari akun"
                className="p-2 rounded-xl text-content-muted hover:text-rose-600 hover:bg-rose-50 border border-border-subtle transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content View with mobile bottom nav compensation padding (pb-24) */}
      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8 flex-1 w-full">
        {activeTab === 'dashboard' && (
          <DashboardPage onNavigate={setActiveTab} />
        )}
        {activeTab === 'analitik' && <AnalyticsPage />}
        {activeTab === 'kandang' && <KandangPage />}
        {activeTab === 'produksi-telur' && <ProduksiTelurPage />}
        {activeTab === 'pengeluaran' && <PengeluaranPage />}
        {activeTab === 'penjualan' && <PenjualanPage />}
        {activeTab === 'stok-telur' && <StokTelurPage />}
      </main>

      {/* Mobile Bottom Navigation (< md) */}
      <BottomNav
        activeTab={activeTab}
        onNavigate={setActiveTab}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* Modal Ekspor Laporan Bulanan */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Footer (Desktop only) */}
      <footer className="border-t border-border-subtle py-6 text-center text-xs text-content-muted hidden md:block">
        <p>© 2026 SiTernak - Sistem Manajemen Peternakan Ayam Petelur.</p>
      </footer>
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    </AuthProvider>
  )
}

export default App
