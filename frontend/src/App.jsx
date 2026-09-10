import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { KandangPage } from './pages/KandangPage'
import { ProduksiTelurPage } from './pages/ProduksiTelurPage'
import { PengeluaranPage } from './pages/PengeluaranPage'
import { PenjualanPage } from './pages/PenjualanPage'
import { StokTelurPage } from './pages/StokTelurPage'
import { DashboardPage } from './pages/DashboardPage'
import { checkServerHealth } from './services/api'
import {
  LayoutDashboard,
  Home,
  Egg,
  TrendingDown,
  Receipt,
  ShoppingCart,
  Boxes,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'

function MainLayout() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'kandang' | 'produksi-telur'
  const [serverStatus, setServerStatus] = useState('checking')

  useEffect(() => {
    checkServerHealth()
      .then((data) => {
        if (data.status === 'ok') {
          setServerStatus('online')
        } else {
          setServerStatus('error')
        }
      })
      .catch(() => {
        setServerStatus('offline')
      })
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center space-x-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20">
                ST
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight tracking-tight text-white flex items-center gap-2">
                  SiTernak
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">Sistem Peternakan Ayam Petelur</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 text-xs">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('kandang')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                  activeTab === 'kandang'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Kandang</span>
              </button>

              <button
                onClick={() => setActiveTab('produksi-telur')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                  activeTab === 'produksi-telur'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Egg className="w-3.5 h-3.5" />
                <span>Produksi Telur</span>
              </button>

              <button
                onClick={() => setActiveTab('pengeluaran')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                  activeTab === 'pengeluaran'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Pengeluaran</span>
              </button>

              <button
                onClick={() => setActiveTab('penjualan')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                  activeTab === 'penjualan'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Penjualan</span>
              </button>

              <button
                onClick={() => setActiveTab('stok-telur')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                  activeTab === 'stok-telur'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Stok Gudang</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Backend status badge */}
            <div className="hidden sm:flex items-center space-x-2 text-xs font-mono bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-full">
              <span
                className={`w-2 h-2 rounded-full ${
                  serverStatus === 'online'
                    ? 'bg-emerald-400 animate-pulse'
                    : serverStatus === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-slate-300">
                DB: {serverStatus === 'online' ? 'Connected' : serverStatus === 'checking' ? 'Connecting...' : 'Offline'}
              </span>
            </div>

            {/* User profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/80 px-3 py-1.5 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white leading-none">{user?.username || 'Owner'}</p>
                  <p className="text-[10px] text-emerald-400 font-medium leading-none mt-0.5">Admin</p>
                </div>
              </div>

              <button
                onClick={logout}
                title="Keluar dari akun"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {activeTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}
        {activeTab === 'kandang' && <KandangPage />}
        {activeTab === 'produksi-telur' && <ProduksiTelurPage />}
        {activeTab === 'pengeluaran' && <PengeluaranPage />}
        {activeTab === 'penjualan' && <PenjualanPage />}
        {activeTab === 'stok-telur' && <StokTelurPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>© 2026 SiTernak - Sistem Manajemen Peternakan Ayam Petelur. Clean Architecture.</p>
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
