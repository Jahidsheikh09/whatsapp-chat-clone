# Deploy Backend (Render) + Frontend (Vercel)

This guide deploys **split hosting**:

- **`server/`** → [Render](https://render.com) (Express API + Socket.IO for real-time chat)
- **`client/`** → [Vercel](https://vercel.com) (React frontend)

---

## Which to deploy first?

**Deploy the backend on Render first.**

The Vercel frontend needs your Render URL at build time (`VITE_API_URL`, `VITE_SERVER_URL`). You cannot configure the client correctly until the backend is live and you know its URL.

```
Step 1  →  Prepare database + Google OAuth
Step 2  →  Deploy backend on Render  ← do this first
Step 3  →  Deploy frontend on Vercel
Step 4  →  Update env vars + Google Console with final URLs
Step 5  →  Test everything
```

---

## Before you start (one-time setup)

### 1. Push code to GitHub

Make sure your repo is on GitHub, for example:

`https://github.com/Jahidsheikh09/whatsapp-chat-clone`

### 2. Create a PostgreSQL database

Render can create one for you, or use any hosted Postgres (Neon, Supabase, etc.).

You will need a connection string like:

```
postgresql://user:password@host:5432/dbname
```

Save it — you will use it as `DATABASE_URL` on Render.

### 3. Set up Google OAuth

Follow [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) in Google Cloud Console:

1. Create a project
2. Configure OAuth consent screen
3. Create a **Web application** OAuth client
4. Copy **Client ID** and **Client Secret**

You will add production URLs in **Step 4** after both apps are deployed. For now, keep the credentials ready.

### 4. Generate a JWT secret

Use a long random string (32+ characters). Example (PowerShell):

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Save it — you will use it as `JWT_SECRET` on Render.

---

## Step 2 — Deploy backend on Render (do this first)

### 2.1 Create a Render account and new Web Service

1. Go to [https://render.com](https://render.com) and sign in with GitHub
2. Click **New +** → **Web Service**
3. Connect your GitHub repo: `whatsapp-chat-clone`
4. Use these settings:

| Setting | Value |
|---|---|
| **Name** | `whatsapp-chat-clone` (or any name you like) |
| **Region** | Choose the closest to your users |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or paid for always-on) |

> **Note:** For split deploy you only need `npm install` on Render.  
> Do **not** run `npm run build` here — that builds the React app, which Vercel will host instead.

### 2.2 Add environment variables on Render

In your Render service → **Environment** → add:

| Variable | Example / notes |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | Your long random secret from above |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `https://YOUR-RENDER-URL.onrender.com/api/auth/google/callback` |
| `CLIENT_URL` | `https://YOUR-VERCEL-URL.vercel.app` (update after Step 3 if unknown yet) |

**First deploy:** If you do not know the Vercel URL yet, temporarily set:

```
CLIENT_URL=http://localhost:5173
```

You will update `CLIENT_URL` to your real Vercel URL in Step 4.

Replace `YOUR-RENDER-URL` with your actual Render subdomain, for example:

```
https://whatsapp-chat-clone.onrender.com
```

So `GOOGLE_CALLBACK_URL` becomes:

```
https://whatsapp-chat-clone.onrender.com/api/auth/google/callback
```

### 2.3 Deploy and verify backend

1. Click **Create Web Service** (or **Save & Deploy**)
2. Wait until the deploy status is **Live**
3. Copy your Render URL, for example:  
   `https://whatsapp-chat-clone.onrender.com`
4. Test the health endpoint in a browser:

```
https://whatsapp-chat-clone.onrender.com/health
```

You should see:

```json
{ "status": "ok" }
```

If this works, your backend is ready. Keep the Render URL — you need it for Vercel.

---

## Step 3 — Deploy frontend on Vercel

### 3.1 Create a Vercel project

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New…** → **Project**
3. Import the same repo: `whatsapp-chat-clone`
4. Use these settings:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite (auto-detected) |
| **Root Directory** | `client` |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `dist` (default) |
| **Install Command** | `npm install` (default) |

> **Important:** Set **Root Directory** to `client`.  
> Do **not** use the repo root — the root `vercel.json` is for single-domain deploy, not this split setup.

### 3.2 Add environment variables on Vercel

Before clicking Deploy, open **Environment Variables** and add:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://whatsapp-chat-clone.onrender.com` |
| `VITE_SERVER_URL` | `https://whatsapp-chat-clone.onrender.com` |

Use your **actual Render URL** from Step 2.3 (no trailing slash).

These are embedded into the frontend at **build time**. If you change them later, you must **redeploy** on Vercel.

### 3.3 Deploy frontend

1. Click **Deploy**
2. Wait until the build finishes
3. Copy your Vercel URL, for example:  
   `https://whatsapp-chat-clone.vercel.app`

---

## Step 4 — Connect backend and frontend (final config)

Now that you have both URLs, update everything so they talk to each other.

### 4.1 Update Render environment variables

Go back to Render → your service → **Environment** and set:

| Variable | Value |
|---|---|
| `CLIENT_URL` | `https://whatsapp-chat-clone.vercel.app` |

(`CLIENT_URL` is used for CORS and for redirecting users after Google login.)

Click **Save Changes** — Render will redeploy automatically.

### 4.2 Update Google Cloud Console

Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → your OAuth client.

**Authorized JavaScript origins** — add:

```
https://whatsapp-chat-clone.vercel.app
```

**Authorized redirect URIs** — must include (exact match):

```
https://whatsapp-chat-clone.onrender.com/api/auth/google/callback
```

Save in Google Console.

### 4.3 Redeploy Vercel (if you used a placeholder URL earlier)

If `VITE_API_URL` / `VITE_SERVER_URL` were wrong on the first Vercel deploy:

1. Fix the env vars in Vercel
2. Go to **Deployments** → **Redeploy** (latest deployment)

---

## Step 5 — Test the full app

Use this checklist:

- [ ] Open Vercel URL in browser — login page loads
- [ ] Open DevTools → Network — API calls go to `https://....onrender.com`, not localhost
- [ ] Sign in with Google — redirects back to Vercel `/auth/callback` and opens chat
- [ ] Open the app in two browser windows — messages appear in real time (Socket.IO)
- [ ] Render `/health` still returns `{ "status": "ok" }`

### Common issues

| Problem | Fix |
|---|---|
| CORS error in browser | Set `CLIENT_URL` on Render to your exact Vercel URL (no trailing slash) |
| Google login fails | Check `GOOGLE_CALLBACK_URL` on Render matches Google Console redirect URI exactly |
| API calls go to localhost | Redeploy Vercel after setting `VITE_API_URL` and `VITE_SERVER_URL` |
| Chat works on one side only | Confirm both `VITE_SERVER_URL` and `VITE_API_URL` point to Render |
| Render service sleeps (free tier) | First request after idle may take ~30s; upgrade or use a keep-alive ping |
| Database errors | Verify `DATABASE_URL` on Render and that Postgres allows Render’s IP |

---

## Quick reference — all production URLs

Replace with your real domains:

| Service | URL |
|---|---|
| Frontend (Vercel) | `https://whatsapp-chat-clone.vercel.app` |
| Backend (Render) | `https://whatsapp-chat-clone.onrender.com` |
| Health check | `https://whatsapp-chat-clone.onrender.com/health` |
| Google callback | `https://whatsapp-chat-clone.onrender.com/api/auth/google/callback` |

---

## Environment variables cheat sheet

### Render (`server/`)

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-long-random-secret
GOOGLE_CLIENT_ID=123456789012-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
GOOGLE_CALLBACK_URL=https://whatsapp-chat-clone.onrender.com/api/auth/google/callback
CLIENT_URL=https://whatsapp-chat-clone.vercel.app
```

### Vercel (`client/`)

```env
VITE_API_URL=https://whatsapp-chat-clone.onrender.com
VITE_SERVER_URL=https://whatsapp-chat-clone.onrender.com
```

---

## Render dashboard summary

```
Root Directory:  server
Build Command:   npm install
Start Command:   npm start
```

## Vercel dashboard summary

```
Root Directory:  client
Build Command:   npm run build
Output:          dist
```

---

## Optional: custom domains

**Vercel (frontend):** Project → Settings → Domains → add your domain (e.g. `chat.yourdomain.com`)

**Render (backend):** Service → Settings → Custom Domains → add (e.g. `api.yourdomain.com`)

After adding custom domains, update:

- Render: `GOOGLE_CALLBACK_URL`, `CLIENT_URL`
- Vercel: `VITE_API_URL`, `VITE_SERVER_URL`
- Google Console: origins and redirect URIs
- Redeploy both services

---

## Related docs

- [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) — Google Cloud OAuth setup
- [README.md](./README.md) — local development and project overview
