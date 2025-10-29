# Server

Simple Express + Socket.IO server for real-time chat.

## Setup

1. Copy env
   - `cp .env.example .env` (on Windows PowerShell: `Copy-Item .env.example .env`)
2. Install deps
   - `npm install`
3. Run
   - Dev: `npm run dev`
   - Prod: `npm start`

The server listens on `PORT` and allows CORS from `CLIENT_URL`.

