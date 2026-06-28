import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiPut } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')
  const isAuthed = !!token && !!user

  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
  }, [token])

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setSessionError('')

    apiGet('/api/users/me', token)
      .then((userData) => {
        if (cancelled) return
        setUser(userData)
        setLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Auth error:', error)
        setSessionError(error.message || 'Sign-in failed. Please try again.')
        setToken('')
        setUser(null)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const setTokenFromOAuth = useCallback((oauthToken) => {
    setSessionError('')
    setToken(oauthToken)
  }, [])

  async function register(data) {
    setSessionError('')
    const res = await apiPost('/api/users/register', data)
    setToken(res.token)
    setUser(res.user)
  }

  async function login(data) {
    setSessionError('')
    const res = await apiPost('/api/users/login', data)
    setToken(res.token)
    setUser(res.user)
  }

  function logout() {
    setSessionError('')
    setToken('')
    setUser(null)
  }

  async function updateProfile(data) {
    const updated = await apiPut('/api/users/me', data, token)
    setUser(updated)
    return updated
  }

  const value = useMemo(
    () => ({ token, user, isAuthed, loading, sessionError, register, login, logout, updateProfile, setTokenFromOAuth }),
    [token, user, isAuthed, loading, sessionError, setTokenFromOAuth]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
