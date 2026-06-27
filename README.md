# WhatsApp-Style Chat App (React + Node + Socket.IO + PostgreSQL)

A full-stack real-time chat application with authentication (email + Google), one-to-one chats, group chats, message delivery/seen ticks, typing indicators, and presence.

## Tech Stack
- Client: React 18 (Vite), Context API, `socket.io-client`, Google Sign-In
- Server: Node.js, Express, Socket.IO, JWT auth, PostgreSQL (Sequelize)
- Tooling: Vite, Nodemon, Helmet, CORS, Rate limiting

## Features
- Authentication: register/login with email + password, or sign in with Google
- Google accounts auto-register on first sign-in (email from Google profile)
- JWT session via `Authorization: Bearer`
- One-to-one chats and group chats
- Realtime messaging via Socket.IO (one-to-one and group)
- Delivery and seen ticks, typing indicators, presence/online status
- Profile update (name, avatar)
- Responsive WhatsApp-like UI

## Monorepo Structure
```
whatsapp-Clone/
  client/
    src/
      context/AuthContext.jsx
      lib/api.js
      pages/App.jsx
      ui/ChatApp.jsx
      ui/AuthPage.jsx
      styles.css
    index.html
    package.json
  server/
    src/
      index.js
      config/db.js
      middleware/auth.js
      models/{User,Chat,Message}.js
      routes/{auth.routes,chat.routes,user.routes}.js
      sockets/index.js
    package.json
```

## Prerequisites
- Node.js 18+
- PostgreSQL database (Neon, Supabase, Railway, or local)
- Google Cloud OAuth Client ID (for Google Sign-In)

## Environment Variables

Server (`server/.env` — copy from `server/.env.example`):
```
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173,http://localhost:5174
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
```

Client (`client/.env` — copy from `client/.env.example`):
```
VITE_SERVER_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
```

### Google Sign-In setup
1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (local dev)
   - `https://your-app.vercel.app` (production)
4. Copy the Client ID into both `GOOGLE_CLIENT_ID` (server) and `VITE_GOOGLE_CLIENT_ID` (client)

## Install & Run

1) Install dependencies and start the server
```
cd server
Copy-Item .env.example .env
npm install
npm run dev   # http://localhost:5000
```

2) Start the web client (new terminal)
```
cd client
Copy-Item .env.example .env
npm install
npm run dev   # http://localhost:5173
```

3) Open http://localhost:5173 — register, login with email, or use **Sign in with Google**

## Scripts

Root (`package.json`):
- `npm run install:all` — install client + server dependencies
- `npm run build` — build client and copy to `server/dist` (for Vercel)
- `npm run dev:client` / `npm run dev:server` — run either side

Client (`client/package.json`):
- `npm run dev`: start Vite dev server (5173)
- `npm run build`: production build
- `npm run preview`: preview built app

Server (`server/package.json`):
- `npm run dev`: start API with Nodemon (5000)
- `npm start`: start API with Node

## How It Works

### Auth flow
- Register/Login via REST (`/api/users/register`, `/api/users/login`)
- Google Sign-In via `/api/users/google` (auto-creates account on first login)
- Client stores JWT and attaches as `Authorization: Bearer <token>`

### Chats and messages
- Client loads chats: `GET /api/chats`
- Select a chat -> load messages: `GET /api/chats/:chatId/messages?limit=50`
- Send message via Socket.IO event; server persists and broadcasts
- Delivery/seen status updates are emitted and reflected in UI ticks

### Group features
- Create group: `POST /api/chats` with `{ isGroup: true, name, memberIds }`
- View members: `GET /api/chats/:chatId/members`
- Remove member (admin): `POST /api/chats/:chatId/members/remove` or `DELETE /api/chats/:chatId/members/:userId`

### User search
- `GET /api/users?q=<term>` returns users to start chats or add to groups

## REST API (summary)
- `POST /api/users/register`
- `POST /api/users/login`
- `POST /api/users/google`
- `GET  /api/users/me`
- `GET  /api/users?q=<term>`
- `GET  /api/chats`
- `POST /api/chats` (create 1:1 or group)
- `GET  /api/chats/:chatId`
- `GET  /api/chats/:chatId/messages`
- `GET  /api/chats/:chatId/members`
- `POST /api/chats/:chatId/members` (add members; admin)
- `POST /api/chats/:chatId/members/remove` (or `DELETE /api/chats/:chatId/members/:userId`)

Authenticated via `Authorization: Bearer <token>`.

## WebSocket Events (summary)

Client → Server:
- `message:send` { chatId, content }
- `message:seen` { messageIds }
- `message:delivered` { messageId }
- `typing` { chatId, typing: boolean }
- `chat:join` chatId

Server → Client:
- `message:new` message
- `message:status` { messageId, userId, status: delivered|seen }
- `user:presence` { userId, isOnline, lastSeen }
- `typing` { chatId, userId, typing }

## Usage Walkthrough
1. Register a new account or log in
2. Use the sidebar search to find a user and start a chat
3. Type and send messages; ticks update as delivered/seen
4. Create a group, add users, and chat in group context
5. Watch online/offline presence and typing indicators

## Troubleshooting
- Client can’t connect: verify `VITE_SERVER_URL` and CORS `CLIENT_URL`
- Empty chats: ensure you’re logged in and MongoDB is reachable (`MONGO_URI`)
- Socket errors: check server console, firewall, and port conflicts
- Time drift: delivery/seen rely on server processing; ensure server is running

If messages show only on the sender side:
- Verify both clients connect to the same backend URL for both REST and sockets (`VITE_SERVER_URL` and `VITE_API_URL`).
- Ensure the server logs show sockets joining rooms on connect and via `chat:join`.
- Confirm `CLIENT_URL` includes your client origin.

## Deployment (Vercel)

This repo is configured for a **single Vercel deployment** (API + React app on one domain).

1. Push to GitHub and import the repo in [Vercel](https://vercel.com)
2. Set **Root Directory** to the repo root (not `client/` or `server/`)
3. Vercel uses `vercel.json` — install runs `npm run install:all`, build runs `npm run build`
4. Add these **Environment Variables** in Vercel:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random secret |
| `GOOGLE_CLIENT_ID` | Same as Google OAuth Client ID |
| `VITE_GOOGLE_CLIENT_ID` | Same value (embedded at build time) |
| `CLIENT_URL` | Your Vercel URL, e.g. `https://your-app.vercel.app` |

5. Redeploy after adding env vars (client needs `VITE_GOOGLE_CLIENT_ID` at build time)

**Note:** Vercel serverless functions do **not** support persistent WebSocket connections. REST API, auth, and Google login work on Vercel; real-time chat (Socket.IO) requires a long-running server (Railway, Render, Fly.io, etc.) or a separate WebSocket service.

For full real-time chat in production, deploy the server to Railway/Render and set `VITE_SERVER_URL` / `VITE_API_URL` to that URL when building the client.

## Roadmap / Optional Features
- File and image upload in chat (store as message.media)
- Notifications for unread messages
- Emoji picker and reactions
- Message search and pagination


## Notes
- This project focuses on readability; production hardening (rate limits, input validation, refresh tokens, file uploads, media, etc.) can be added as needed.


