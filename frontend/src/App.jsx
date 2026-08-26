import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { KandangPage } from './pages/KandangPage'
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

function DashboardOverview({ onNavigate }) {
  const { user } = useAuth()

  return (
    <div>
      {/* Welcome Banner */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40 border border-emerald-500/20 backdrop-blur flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sesi Terautentikasi (JWT Token Active)</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Selamat Datang, {user?.username}!
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Pusat kendali operasional peternakan ayam petelur SiTernak.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
          <span>User ID: #{user?.id || 1}</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">Active</span>
        </div>
      </div>

      {/* 6 Core Modules Grid */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Modul Operasional Peternakan
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Kandang Module - Active & Interactive */}
          <div
            onClick={() => onNavigate('kandang')}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group relative overflow-hidden shadow-lg hover:shadow-emerald-500/5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                <Home className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                T1.1 Ready
              </span>
            </div>
            <h4 className="font-bold text-white text-base mb-1 group-hover:text-emerald-400 transition flex items-center justify-between">
              <span>Manajemen Kandang</span>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Setup kandang awal, pemantauan populasi ayam, dan perubahan status aktif/afkir.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 opacity-80">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
              <Egg className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white text-base mb-1">Produksi Telur</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pencatatan butir telur harian (kategori normal, retak, pecah) per kandang.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 opacity-80">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white text-base mb-1">Mortalitas Ayam</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monitoring kematian ayam harian untuk penyesuaian populasi dan analisis kesehatan.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 opacity-80">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <Receipt className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white text-base mb-1">Biaya & Pengeluaran</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pencatatan pembelian pakan, obat/vitamin, listrik, air, dan gaji tenaga kerja.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 opacity-80">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white text-base mb-1">Penjualan Telur</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pencatatan transaksi penjualan telur dalam satuan butir, kg, maupun tray.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 opacity-80">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
              <Boxes className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white text-base mb-1">Stok Fisik Telur</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Opname dan rekonsiliasi stok fisik telur siap jual di gudang penyimpanan.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MainLayout() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'kandang'
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
        {activeTab === 'dashboard' && <DashboardOverview onNavigate={setActiveTab} />}
        {activeTab === 'kandang' && <KandangPage />}
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
