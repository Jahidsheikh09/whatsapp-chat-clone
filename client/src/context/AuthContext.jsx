import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiPut } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false) // Start with false, only true when fetching
  const [sessionError, setSessionError] = useState('')
  const isAuthed = !!token && !!user

  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
  }, [token])

  useEffect(() => {
    if (!token) {
      console.log('AuthContext: No token, skipping user fetch')
      setUser(null)
      setLoading(false)
      setSessionError('')
      return
    }

    let cancelled = false
    let timeoutId = null

    const fetchUser = async () => {
      setLoading(true)
      setSessionError('')
      console.log('AuthContext: Fetching user data with token:', token.substring(0, 20) + '...')

      try {
        // Add a timeout to prevent hanging
        const abortController = new AbortController()
        timeoutId = setTimeout(() => abortController.abort(), 10000) // 10 second timeout

        const userData = await apiGet('/api/users/me', token)
        
        clearTimeout(timeoutId)
        
        if (cancelled) {
          console.log('AuthContext: Request cancelled, ignoring response')
          return
        }
        
        console.log('AuthContext: User data fetched successfully:', userData)
        setUser(userData)
        setLoading(false)
        setSessionError('')
      } catch (error) {
        clearTimeout(timeoutId)
        
        if (cancelled) {
          console.log('AuthContext: Request failed but cancelled, ignoring error')
          return
        }
        
        console.error('AuthContext: Failed to fetch user data:', error)
        console.error('AuthContext: Full error message:', error.message)
        
        // If token is invalid, clear it and show login
        setSessionError('Session expired. Please login again.')
        setToken('')
        setUser(null)
        setLoading(false)
      }
    }

    fetchUser()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [token])

  const setTokenFromOAuth = useCallback((oauthToken) => {
    console.log('AuthContext: Setting token from OAuth')
    setSessionError('')
    setToken(oauthToken)
  }, [])

  async function register(data) {
    console.log('AuthContext: Registering user:', data.email)
    setSessionError('')
    try {
      const res = await apiPost('/api/users/register', data)
      console.log('AuthContext: Registration successful')
      setToken(res.token)
      setUser(res.user)
      return res
    } catch (error) {
      console.error('AuthContext: Registration failed:', error.message)
      setSessionError(error.message)
      throw error
    }
  }

  async function login(data) {
    console.log('AuthContext: Logging in user:', data.email)
    setSessionError('')
    try {
      const res = await apiPost('/api/users/login', data)
      console.log('AuthContext: Login successful')
      setToken(res.token)
      setUser(res.user)
      return res
    } catch (error) {
      console.error('AuthContext: Login failed:', error.message)
      setSessionError(error.message)
      throw error
    }
  }

  function logout() {
    console.log('AuthContext: Logging out')
    setSessionError('')
    setToken('')
    setUser(null)
  }

  async function updateProfile(data) {
    console.log('AuthContext: Updating profile')
    try {
      const updated = await apiPut('/api/users/me', data, token)
      setUser(updated)
      return updated
    } catch (error) {
      console.error('AuthContext: Profile update failed:', error.message)
      throw error
    }
  }

  const value = useMemo(
    () => ({ token, user, isAuthed, loading, sessionError, register, login, logout, updateProfile, setTokenFromOAuth }),
    [token, user, isAuthed, loading, sessionError, setTokenFromOAuth]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
