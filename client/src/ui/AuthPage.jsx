import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getGoogleAuthUrl } from '../lib/api'

export default function AuthPage({ initialError = '' }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', username: '', name: '' })
  const [error, setError] = useState(initialError)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialError) setError(initialError)
  }, [initialError])

  function signInWithGoogle() {
    setError('')
    window.location.href = getGoogleAuthUrl()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      setError('')
      setSubmitting(true)
      if (mode === 'login') await login({ email: form.email, password: form.password })
      else await register(form)
    } catch (err) {
      setError(err.message || 'Failed. Check details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="centered">
      <div className="card auth-card">
        <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in with Google or email to start chatting.'
            : 'Register with Google or email to join the chat.'}
        </p>

        <button
          type="button"
          className="google-signin-btn"
          onClick={signInWithGoogle}
          disabled={submitting}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
        </button>

        <div className="auth-divider">
          <span>or use email</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <input
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
              <input
                placeholder="Display name (optional)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Login with email' : 'Register with email'}
          </button>
        </form>

        <button
          type="button"
          className="auth-link"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
        >
          {mode === 'login' ? 'Create an account' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  )
}
