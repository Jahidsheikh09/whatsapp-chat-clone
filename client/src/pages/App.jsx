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
  const { isAuthed, token, user, loading, sessionError } = useAuth()
  const [oauthError, setOauthError] = useState('')

  useEffect(() => {
    console.log('App: Auth state update -', {
      isAuthed,
      hasToken: !!token,
      hasUser: !!user,
      loading,
      sessionError
    })
  }, [isAuthed, token, user, loading, sessionError])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')

    if (error && GOOGLE_ERRORS[error]) {
      console.log('App: OAuth error detected:', error)
      setOauthError(GOOGLE_ERRORS[error])
      window.history.replaceState({}, '', window.location.pathname || '/')
    }
  }, [])

  const authError = oauthError || sessionError

  const socket = useMemo(() => {
    if (!token) {
      console.log('App: No token, socket creation skipped')
      return null
    }
    try {
      console.log('App: Creating Socket.IO connection')
      const newSocket = io(WS_URL, { withCredentials: true, auth: { token } })
      console.log('App: Socket.IO instance created')
      return newSocket
    } catch (error) {
      console.error('App: Failed to create Socket.IO connection:', error)
      return null
    }
  }, [token])

  useEffect(() => {
    if (socket) {
      console.log('App: Setting up socket disconnect cleanup')
      return () => {
        console.log('App: Disconnecting socket')
        socket.disconnect()
      }
    }
  }, [socket])

  // Show loading only during the token validation phase
  if (loading && token) {
    console.log('App: Rendering loading state (validating token)')
    return (
      <div className="centered">
        <div className="card">
          <h1>⏳ Loading...</h1>
          <p>Verifying your session...</p>
          <p style={{ fontSize: '12px', color: 'var(--subtext)', marginTop: '10px' }}>
            Please wait while we load your profile.
          </p>
        </div>
      </div>
    )
  }

  if (import.meta.env.PROD && !getServerUrl()) {
    console.log('App: Rendering configuration error state')
    return (
      <div className="centered">
        <div className="card auth-card">
          <h1>⚙️ Configuration Error</h1>
          <p className="auth-error">
            Backend URL is missing. In Vercel, set <code>VITE_API_URL</code> and{' '}
            <code>VITE_SERVER_URL</code> to your Render URL, then redeploy.
          </p>
        </div>
      </div>
    )
  }

  // If not authenticated (either never had token or token was cleared), show login
  if (!isAuthed) {
    console.log('App: Rendering AuthPage (not authenticated)')
    return <AuthPage initialError={authError} />
  }

  // If authenticated, show chat
  console.log('App: Rendering ChatApp (authenticated)')
  return <ChatApp socket={socket} />
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  )
}
