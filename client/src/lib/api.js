function resolveBackendUrl() {
  const fromEnv = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SERVER_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (import.meta.env.PROD) return ''
  return 'http://localhost:5000'
}

const API_URL = resolveBackendUrl()

export function getServerUrl() {
  return API_URL
}

export function getGoogleAuthUrl() {
  if (!API_URL) {
    throw new Error('Backend URL is missing. Set VITE_API_URL on Vercel to your Render URL and redeploy.')
  }
  const returnTo = encodeURIComponent(window.location.origin)
  return `${API_URL}/api/auth/google?returnTo=${returnTo}`
}

function getHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function parseError(res) {
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return data.message || text || 'Request failed'
  } catch {
    return text || 'Request failed'
  }
}

async function parseJsonResponse(res) {
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const hint = API_URL
      ? 'Could not reach the API. Check VITE_API_URL on Vercel matches your Render backend URL.'
      : 'Backend URL is missing. Set VITE_API_URL and VITE_SERVER_URL on Vercel to your Render URL and redeploy.'
    throw new Error(hint)
  }
  return res.json()
}

function ensureApiUrl() {
  if (!API_URL) {
    throw new Error('Backend URL is missing. Set VITE_API_URL on Vercel to your Render URL and redeploy.')
  }
}

export async function apiGet(path, token) {
  ensureApiUrl()
  const res = await fetch(`${API_URL}${path}`, { headers: getHeaders(token), credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return parseJsonResponse(res)
}

export async function apiPost(path, body, token) {
  ensureApiUrl()
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify(body), credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return parseJsonResponse(res)
}

export async function apiPut(path, body, token) {
  ensureApiUrl()
  const res = await fetch(`${API_URL}${path}`, { method: 'PUT', headers: getHeaders(token), body: JSON.stringify(body), credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return parseJsonResponse(res)
}


