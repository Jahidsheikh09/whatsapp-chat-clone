# Google OAuth Setup Guide (WhatsApp Chat Clone)

Follow these steps in Google Cloud Console, then paste the values into `server/.env`.

> **Important:** Never put your Google account password in code or `.env`.  
> OAuth only uses **Client ID** and **Client Secret** from Google Cloud.

---

## Step 1: Open Google Cloud Console

Go to [Google Cloud Console](https://console.cloud.google.com/) and sign in with your Google account.

## Step 2: Create a New Project

1. Click the **project dropdown** at the top
2. Click **New Project**
3. Name it e.g. **Whatsapp Chat Clone**
4. Click **Create** and wait for it to finish

## Step 3: Enable Google Identity API

1. Go to [APIs Library](https://console.cloud.google.com/apis/library)
2. Search for **Google Identity** or **Google People API**
3. Open it and click **Enable** (if not already enabled)

## Step 4: Configure OAuth Consent Screen

1. Go to [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Choose **External** → **Create**
3. Fill in:
   - **App name:** Whatsapp Clone
   - **User support email:** your@gmail.com
   - **Developer email:** your@gmail.com
4. Click **Save and Continue** through all steps until done

## Step 5–6: Create OAuth Client ID

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **+ Create Credentials** → **OAuth Client ID**
3. Application type: **Web application**
4. Name: **Whatsapp Clone**

## Step 7: Authorized JavaScript Origins

Add your frontend URLs:

```
http://localhost:5173
https://whatsapp-chat-clone.vercel.app
```

## Step 8: Authorized Redirect URIs

Add your **backend callback URL** (must match `GOOGLE_CALLBACK_URL` in `.env` exactly):

**Local development:**
```
http://localhost:5000/api/auth/google/callback
```

**Production (backend on Render):**
```
https://whatsapp-chat-clone.onrender.com/api/auth/google/callback
```

**Production (single Vercel deploy):**
```
https://whatsapp-chat-clone.vercel.app/api/auth/google/callback
```

## Step 9–11: Copy credentials to `.env`

After clicking **Create**, copy **Client ID** and **Client Secret** into `server/.env`:

```env
GOOGLE_CLIENT_ID=123456789012-abcdefghijklm.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-long-random-secret
DATABASE_URL=postgresql://...
```

Restart the server after saving `.env`.

---

## How login works in this app

1. User clicks **Sign in with Google** on the login page
2. Browser goes to `GET /api/auth/google` (Passport.js redirect)
3. User picks their Google account on Google's page
4. Google redirects to `GET /api/auth/google/callback`
5. Server creates/finds the user, issues a JWT, redirects to frontend `/auth/callback?token=...`
6. App saves the token and opens the chat

---

## Deployment examples

### Frontend on Vercel + Backend on Render

**Render env:**
```env
GOOGLE_CALLBACK_URL=https://whatsapp-chat-clone.onrender.com/api/auth/google/callback
CLIENT_URL=https://whatsapp-chat-clone.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Vercel env:**
```env
VITE_API_URL=https://whatsapp-chat-clone.onrender.com
VITE_SERVER_URL=https://whatsapp-chat-clone.onrender.com
```

**Google Console origins:** `https://whatsapp-chat-clone.vercel.app`  
**Google Console redirect:** `https://whatsapp-chat-clone.onrender.com/api/auth/google/callback`

### Single Vercel deploy (API + frontend together)

**Vercel env:**
```env
GOOGLE_CALLBACK_URL=https://whatsapp-chat-clone.vercel.app/api/auth/google/callback
CLIENT_URL=https://whatsapp-chat-clone.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Google Console origins:** `https://whatsapp-chat-clone.vercel.app`  
**Google Console redirect:** `https://whatsapp-chat-clone.vercel.app/api/auth/google/callback`
