import React, { createContext, useContext, useState, useEffect } from 'react'
import { loginUser, fetchCurrentUser, logoutUser } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('siternak_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Verify token on mount and restore user profile
  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem('siternak_token')
      if (storedToken) {
        try {
          const userData = await fetchCurrentUser(storedToken)
          setUser(userData)
          setToken(storedToken)
        } catch {
          // Token invalid or expired
          localStorage.removeItem('siternak_token')
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }

    restoreSession()
  }, [])

  const login = async (username, password) => {
    setError(null)
    try {
      const data = await loginUser(username, password)
      const accessToken = data.access_token
      localStorage.setItem('siternak_token', accessToken)
      setToken(accessToken)

      const profile = await fetchCurrentUser(accessToken)
      setUser(profile)
      return { success: true }
    } catch (err) {
      setError(err.message || 'Login failed')
      return { success: false, error: err.message }
    }
  }

  const logout = async () => {
    try {
      await logoutUser()
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('siternak_token')
      setToken(null)
      setUser(null)
      setError(null)
    }
  }

  const value = {
    token,
    user,
    isAuthenticated: !!token && !!user,
    loading,
    error,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
