// Empty string = same origin (works on Vercel when client + API share one domain)
const API_URL =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.PROD ? '' : 'http://localhost:5000');

export function getGoogleAuthUrl() {
  const returnTo = encodeURIComponent(window.location.origin);
  return `${API_URL}/api/auth/google?returnTo=${returnTo}`;
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
      : 'API URL is missing. Set VITE_API_URL to your backend URL on Vercel and redeploy.'
    throw new Error(hint)
  }
  return res.json()
}

export async function apiGet(path, token) {
  const res = await fetch(`${API_URL}${path}`, { headers: getHeaders(token), credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return parseJsonResponse(res)
}

export async function apiPost(path, body, token) {
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify(body), credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return parseJsonResponse(res)
}

export async function apiPut(path, body, token) {
  const res = await fetch(`${API_URL}${path}`, { method: 'PUT', headers: getHeaders(token), body: JSON.stringify(body), credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return parseJsonResponse(res)
}


