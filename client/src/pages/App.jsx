import React, { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { AuthProvider, useAuth } from '../context/AuthContext.jsx'
import AuthPage from '../ui/AuthPage.jsx'
import ChatApp from '../ui/ChatApp.jsx'

import { getServerUrl } from '../lib/api'

const WS_URL = getServerUrl() || 'http://localhost:5000'

const GOOGLE_ERRORS = {
  google_auth_failed: 'Google sign-in failed. Please try again.',
  google_not_configured: 'Google sign-in is not configured on the server.',
}

function Inner() {
  const { isAuthed, token, loading, sessionError } = useAuth()
  const [oauthError, setOauthError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')

    if (error && GOOGLE_ERRORS[error]) {
      setOauthError(GOOGLE_ERRORS[error])
      window.history.replaceState({}, '', window.location.pathname || '/')
    }
  }, [])

  const authError = oauthError || sessionError

  const socket = useMemo(() => {
    if (!token) return null
    return io(WS_URL, { withCredentials: true, auth: { token } })
  }, [token])

  useEffect(() => {
    if (socket) {
      return () => socket.disconnect()
    }
  }, [socket])

  if (loading) {
    return (
      <div className="centered">
        <div className="card">
          <h1>Loading...</h1>
          <p>Please wait while we load your data.</p>
        </div>
      </div>
    )
  }

  if (import.meta.env.PROD && !getServerUrl()) {
    return (
      <div className="centered">
        <div className="card auth-card">
          <h1>Configuration error</h1>
          <p className="auth-error">
            Backend URL is missing. In Vercel, set <code>VITE_API_URL</code> and{' '}
            <code>VITE_SERVER_URL</code> to your Render URL, then redeploy.
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthed) return <AuthPage initialError={authError} />
  return <ChatApp socket={socket} />
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  )
}
