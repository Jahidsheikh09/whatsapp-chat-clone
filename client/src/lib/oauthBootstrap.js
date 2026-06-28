/** Capture OAuth token from URL before React mounts (sync, no race conditions). */
export function captureOAuthTokenFromUrl() {
  if (typeof window === 'undefined') return false

  try {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) return false

    localStorage.setItem('token', token)

    params.delete('token')
    const search = params.toString()
    const cleanUrl =
      (window.location.pathname || '/') +
      (search ? `?${search}` : '') +
      window.location.hash
    window.history.replaceState({}, '', cleanUrl)

    return true
  } catch (error) {
    console.error('Failed to capture OAuth token:', error)
    return false
  }
}
