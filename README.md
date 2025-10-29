# WhatsApp-Style Chat App (React + Node + Socket.IO + MongoDB)

A full-stack real-time chat application with authentication, one-to-one chats, group chats, message delivery/seen ticks, typing indicators, and presence. Built for clarity and interview-friendly readability.

## Tech Stack
- Client: React 18 (Vite), Context API, `socket.io-client`
- Server: Node.js, Express, Socket.IO, JWT auth, MongoDB (Mongoose)
- Tooling: Vite, Nodemon, Helmet, CORS, Rate limiting

## Features
- Authentication (register/login) with JWT, persistent session via `Authorization: Bearer` and cookies
- One-to-one chats and group chats
- Realtime messaging via Socket.IO
- Delivery and seen ticks on messages
- Typing indicators
- Presence/online status and last seen
- Group management (create group, view members, remove members if admin)
- User search to start chats or add to groups
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
- MongoDB (local or cloud). Docker optional
- Windows PowerShell (commands below are Windows-friendly)

## Environment Variables

Server (`server/.env`):
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/whatsapp_clone
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Client (`client/.env`):
```
VITE_API_URL=http://localhost:5000
VITE_SERVER_URL=http://localhost:5000
```

## Install & Run (Windows PowerShell)

1) Start the API/Socket server
```
cd server
Copy-Item .env.example .env -ErrorAction SilentlyContinue
# or create .env with the variables above
npm install
npm run dev   # http://localhost:5000
```

2) Start the web client
```
cd ../client
# create client .env if needed
npm install
npm run dev   # http://localhost:5173
```

3) Open the app at http://localhost:5173

Optional: run MongoDB with Docker
```
# example (adjust to your preference)
docker run -d --name mongo -p 27017:27017 mongo:7
```

## Scripts

Client (`client/package.json`):
- `npm run dev`: start Vite dev server (5173)
- `npm run build`: production build
- `npm run preview`: preview built app

Server (`server/package.json`):
- `npm run dev`: start API with Nodemon (5000)
- `npm start`: start API with Node

## How It Works

### Auth flow
- Register/Login via REST (`/api/auth/register`, `/api/auth/login`)
- Client stores token in memory and attaches as `Authorization: Bearer <token>`
- Protected routes validated by middleware on the server

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
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET  /api/auth/me`
- `GET  /api/users?q=<term>`
- `GET  /api/chats`
- `POST /api/chats` (create 1:1 or group)
- `GET  /api/chats/:chatId/messages`
- `GET  /api/chats/:chatId/members`
- `POST /api/chats/:chatId/members/remove` (or `DELETE /api/chats/:chatId/members/:userId`)

Authenticated via `Authorization: Bearer <token>`.

## WebSocket Events (summary)

Client → Server:
- `message:send` { chatId, content }
- `message:seen` { messageIds }
- `message:delivered` { messageId }
- `typing` { chatId, typing: boolean }

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

## Notes
- This project focuses on readability; production hardening (rate limits, input validation, refresh tokens, file uploads, media, etc.) can be added as needed.


