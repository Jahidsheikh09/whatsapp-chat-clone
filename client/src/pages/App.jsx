import React, { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { AuthProvider, useAuth } from '../context/AuthContext.jsx'
import AuthPage from '../ui/AuthPage.jsx'
import ChatApp from '../ui/ChatApp.jsx'

const WS_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000')

const GOOGLE_ERRORS = {
  google_auth_failed: 'Google sign-in failed. Please try again.',
  google_not_configured: 'Google sign-in is not configured on the server.',
}

function Inner() {
  const { isAuthed, token, loading, setTokenFromOAuth } = useAuth()
  const [oauthError, setOauthError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthToken = params.get('token')
    const error = params.get('error')

    if (oauthToken) {
      setTokenFromOAuth(oauthToken)
      window.history.replaceState({}, '', '/')
      return
    }

    if (error && GOOGLE_ERRORS[error]) {
      setOauthError(GOOGLE_ERRORS[error])
      window.history.replaceState({}, '', '/')
    }
  }, [setTokenFromOAuth])

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

  if (!isAuthed) return <AuthPage initialError={oauthError} />
  return <ChatApp socket={socket} />
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  )
}
