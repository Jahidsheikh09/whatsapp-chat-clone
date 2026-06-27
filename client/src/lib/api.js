// Empty string = same origin (works on Vercel when client + API share one domain)
const API_URL =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.PROD ? '' : 'http://localhost:5000');

export function getGoogleAuthUrl() {
  return `${API_URL}/api/auth/google`;
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

export async function apiGet(path, token) {
  const res = await fetch(`${API_URL}${path}`, { headers: getHeaders(token), credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function apiPost(path, body, token) {
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify(body), credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function apiPut(path, body, token) {
  const res = await fetch(`${API_URL}${path}`, { method: 'PUT', headers: getHeaders(token), body: JSON.stringify(body), credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}


