import React, { useState, useEffect } from 'react'
import { Activity, Server, LayoutDashboard, Database, CheckCircle2 } from 'lucide-react'

function App() {
  const [serverStatus, setServerStatus] = useState('checking')
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  useEffect(() => {
    fetch(`${apiBaseUrl}/health`)
      .then((res) => res.json())
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
  }, [apiBaseUrl])

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20">
              ST
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white">SiTernak</h1>
              <p className="text-xs text-slate-400 font-medium">Sistem Manajemen Peternakan Ayam Petelur</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-xs font-mono bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-full">
            <span className={`w-2 h-2 rounded-full ${
              serverStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 
              serverStatus === 'checking' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
            }`} />
            <span className="text-slate-300">
              Backend: {serverStatus === 'online' ? 'Online' : serverStatus === 'checking' ? 'Connecting...' : 'Offline (localhost:8000)'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="max-w-5xl mx-auto px-4 py-16 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Ticket T0.1 Initialized - Clean Architecture Ready</span>
        </div>

        <h2 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-emerald-400 tracking-tight max-w-3xl mb-6">
          SiTernak System
        </h2>
        
        <p className="text-slate-400 text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
          Fondasi sistem terintegrasi untuk pemantauan produksi telur, efisiensi pakan, dan manajemen kandang presisi berbasis FastAPI & React.
        </p>

        {/* Modular Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left">
          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur hover:border-slate-600 transition">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white mb-1">FastAPI Backend</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Layered architecture (Routers, Services, Repositories, Schemas) siap untuk ekspansi API.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur hover:border-slate-600 transition">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white mb-1">React + Vite Frontend</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Modern UI toolkit dengan Tailwind CSS, siap terhubung dengan REST endpoint.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur hover:border-slate-600 transition">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white mb-1">Database Ready</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Struktur data model siap untuk integrasi PostgreSQL & SQLAlchemy pada Ticket T0.2.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>© 2026 SiTernak - Sistem Manajemen Peternakan Ayam Petelur. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
