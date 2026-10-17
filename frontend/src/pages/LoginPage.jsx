import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Silakan isi username dan password.')
      return
    }

    setIsSubmitting(true)
    const result = await login(username, password)
    setIsSubmitting(false)

    if (!result.success) {
      setErrorMessage(result.error || 'Username atau password salah.')
    }
  }

  return (
    <div className="min-h-screen bg-surface-page text-content-primary flex items-center justify-center p-4">
      {/* Background Soft Ambient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white border border-border-subtle rounded-2xl shadow-xl p-6 sm:p-8">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand text-white font-black text-2xl shadow-md shadow-brand/20 mb-4">
            ST
          </div>
          <h1 className="text-2xl font-black tracking-tight text-content-primary">SiTernak System</h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-1">Masuk untuk mengelola operasional peternakan</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs shadow-xs animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <p className="font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-content-primary uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-surface-page border border-border-subtle text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-content-primary uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
                className="w-full pl-10 pr-11 py-2.5 min-h-[44px] rounded-xl bg-surface-page border border-border-subtle text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-content-muted hover:text-content-primary transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 min-h-[44px] rounded-xl bg-brand hover:bg-brand-hover text-white font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed mt-4 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk ke Dashboard</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
