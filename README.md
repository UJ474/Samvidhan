# Samvidhan (Sansthaein Aur Samvidhan)

An interactive civic learning platform for the Constitution of India (Parts V & VI), featuring 5 offline solo game modes, deterministic physical spinning wheel physics, classroom multiplayer quizzes, and an Electron macOS desktop app with full-screen projector mode.

---

## 💡 How the DMG App & Backend Work Together

### 1. Solo Modes (100% Offline in the DMG)
When you install and open the **DMG (`Samvidhan.app`)**:
- **Learn**, **Quiz**, **Spin the Wheel**, **Flash Cards**, **Snakes & Ladders**, and **Profile & Bookmarks** are bundled inside the app.
- **Zero internet connection and NO backend server are needed for solo play.** Everything runs locally on your Mac.

### 2. Live Multiplayer Mode (Classroom & Group Quizzes)
When you use **Host Game** or **Join Game** with other players joining from phones:
- In local development: The desktop app connects to `http://localhost:3001` (started via `pnpm run dev:server`).
- In production: Deploy the backend (`apps/server`) to any cloud host (e.g. Render, Railway, Fly.io, or your VPS). The single deployed server hosts both the WebSocket multiplayer engine AND serves the mobile web join page (`https://your-domain/join/CODE`)!
- **Configuring the Server in the Desktop App**: Open **Profile & Ledgers ➔ Preferences ➔ Multiplayer Server URL**, enter your deployed URL (e.g. `https://samvidhan.onrender.com`), and click **Save**.

---

## ☁️ Deployment Guide: Step-by-Step

Because `apps/server` automatically serves the pre-compiled `apps/web/dist` on the root `/`, **you only need to deploy ONE unified service** for both the Web join page and the WebSocket backend!

### Option A: 1-Click Free Deploy on Render (Recommended)
1. Go to [render.com](https://render.com) and connect your GitHub repo (`UJ474/Samvidhan`).
2. Select **Web Service**. Render will automatically detect [`render.yaml`](file:///Users/utkarshjain/Desktop/Samvidhan/render.yaml):
   - **Environment**: Node
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `node apps/server/dist/server.js`
   - **Port**: `3001`
3. Click **Deploy Web Service**.
4. Once deployed, Render gives you a public HTTPS URL (e.g., `https://samvidhan.onrender.com`).
   - Anyone on a phone can visit: `https://samvidhan.onrender.com/join/CODE`
   - In your Desktop DMG app, set `https://samvidhan.onrender.com` in Profile ➔ Server URL.

### Option B: Railway
1. Go to [railway.app](https://railway.app) and select **Deploy from GitHub repo**.
2. Select `UJ474/Samvidhan`.
3. Set environment variable: `PORT=3001`.
4. Railway will build using the included [`Dockerfile`](file:///Users/utkarshjain/Desktop/Samvidhan/Dockerfile) or Node buildpack automatically.

### Option C: Docker / Self-Hosted VPS
A production multi-stage [`Dockerfile`](file:///Users/utkarshjain/Desktop/Samvidhan/Dockerfile) is provided in the repository root:
```bash
docker build -t samvidhan .
docker run -p 3001:3001 samvidhan
```

---

## 📁 Repository Structure & Where Everything Lives

```
Samvidhan/
├── packages/
│   ├── core/                  # Pure TypeScript Game Engine & Constitution Data
│   │   ├── src/data.ts        # 26 Constitution articles with 78 verified questions
│   │   ├── src/wheel.ts       # Deterministic seeded wheel math (mulberry32)
│   │   ├── src/scoring.ts     # Terminal 5-star rating & live speed/streak scoring
│   │   ├── src/snakes.ts      # 30-square Snakes & Ladders game engine
│   │   └── test/              # 16 Unit tests (10,000-spin verification suite)
│   └── protocol/              # Shared Socket.IO contracts & Zod validators
│       └── src/index.ts       # Type-safe event names, payloads, and schemas
├── apps/
│   ├── server/                # 🌐 THE BACKEND (Node.js + Fastify + Socket.IO)
│   │   ├── src/server.ts      # Fastify HTTP & Socket.IO server (Port 3001)
│   │   ├── src/room.ts        # Authoritative room state machine & anti-cheat
│   │   ├── src/bots.ts        # Bot simulation load testing script
│   │   └── test/              # Multiplayer integration test suite
│   ├── web/                   # 💻 THE FRONTEND (React + Vite Single-Page App)
│   │   ├── src/screens/       # All 5 Solo Modes + Live Player & Host Console
│   │   │   ├── HomeScreen.tsx         # Dashboard with streak, modes, actions
│   │   │   ├── LearnScreen.tsx        # Article deck by organ with bookmarks
│   │   │   ├── QuizScreen.tsx         # 10 questions with immediate review
│   │   │   ├── WheelScreen.tsx        # 5 physical wheel rounds with peg sounds
│   │   │   ├── FlashCardsScreen.tsx   # 3D physical card flip (spaced repetition)
│   │   │   ├── SnakesLaddersScreen.tsx# 2-player pass-and-play board game
│   │   │   ├── JoinScreen.tsx         # Live player client (/join/:code)
│   │   │   ├── HostScreen.tsx         # Host projector console & QR code
│   │   │   └── ProfileScreen.tsx      # Stats, accuracy by organ, theme & server URL toggle
│   │   ├── src/components/    # Ashoka Chakra SVG, physical SpinningWheel
│   │   └── src/services/      # Web Audio synthesizer, LocalStorage, Socket client
│   └── desktop/               # 🖥️ THE ELECTRON DESKTOP APP
│       ├── src/main.js        # macOS native window, menus, projector mode
│       ├── src/preload.js     # Context bridge
│       └── dist/              # 📦 Built DMG and macOS application binaries
└── content/
    └── data.json              # Migrated and expanded 26 articles dataset
```

---

## 📦 Where is the DMG Stored?

After running `pnpm run dist:desktop`, the macOS installer is generated in:
```
apps/desktop/dist/Samvidhan-1.0.0-arm64.dmg
```
- **Size**: ~94 MB (minimal bare Electron runtime with no bloat).
- **Standalone App Directory**: `apps/desktop/dist/mac-arm64/Samvidhan.app`

---

## 🚀 Commands Reference

| Action | Command |
|---|---|
| **Run Web App locally** | `pnpm run dev:web` *(http://localhost:5173)* |
| **Run Backend locally** | `pnpm run dev:server` *(http://localhost:3001)* |
| **Run Electron Desktop app** | `pnpm run dev:desktop` |
| **Build macOS DMG installer**| `pnpm run dist:desktop` |
| **Run all automated tests** | `pnpm test` |
| **Spawn 20 test bots in room** | `pnpm --filter @samvidhan/server bots <CODE> 20` |
