# Samvidhan (Sansthaein Aur Samvidhan)

An interactive civic learning platform for the Constitution of India (Parts V & VI), featuring 5 offline solo game modes, deterministic physical spinning wheel physics, classroom multiplayer quizzes, and an Electron macOS desktop app with full-screen projector mode.

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
│   │   │   └── ProfileScreen.tsx      # Stats, accuracy by organ, theme toggle
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

After running the packaging command, the macOS DMG file is generated in:
```
apps/desktop/dist/Samvidhan-1.0.0-arm64.dmg
```

- **DMG Size**: ~94 MB (minimal footprint containing standard Chromium + Node runtime, with the web app taking < 400 KB).
- **Standalone App Directory**: `apps/desktop/dist/mac-arm64/Samvidhan.app`

---

## 🌐 Where is the Backend?

The backend is located in `apps/server/`:
- **File**: [`apps/server/src/server.ts`](file:///Users/utkarshjain/Desktop/Samvidhan/apps/server/src/server.ts)
- **Port**: `3001` (configurable via `PORT` environment variable)
- **Engine**: [`apps/server/src/room.ts`](file:///Users/utkarshjain/Desktop/Samvidhan/apps/server/src/room.ts)
- **Key Features**:
  - Authoritative room state machine: `LOBBY` ➔ `WHEEL` ➔ `QUESTION` ➔ `REVEAL` ➔ `LEADERBOARD` ➔ `FINISHED`.
  - **Zero answer leaks (Anti-Cheat)**: Questions broadcasted to clients do not include the answer or explanation until the round ends.
  - **Clock synchronization**: Server sends `serverNow` and `endsAt` so client countdowns are immune to device clock drift.
  - **Healthcheck endpoint**: `GET http://localhost:3001/healthz`

---

## 🚀 Running the App Locally

### 1. Web App (Development)
```bash
pnpm run dev:web
```
Runs at: `http://localhost:5173`

### 2. Backend Server (Development)
```bash
pnpm run dev:server
```
Runs at: `http://localhost:3001`

### 3. Desktop App (Electron)
```bash
pnpm run dev:desktop
```
Launches the native macOS window with menu bar, traffic lights, and keyboard shortcuts (`Space` to advance rounds, `Esc` to pause).

### 4. Build the macOS DMG
```bash
pnpm run dist:desktop
```
Compiles `@samvidhan/web` into static assets, packages it with Electron, and generates the installer at `apps/desktop/dist/Samvidhan-1.0.0-arm64.dmg`.

---

## 🧪 Testing

Run all unit tests and backend integration tests:
```bash
pnpm test
```

Run bot simulation (spawn 20 bots in room `XYZ123`):
```bash
pnpm --filter @samvidhan/server bots XYZ123 20
```

---

## 🎨 Design System: "Printed Civic Document"

- **Typography**: Young Serif (headings & numerals), Newsreader (legal text & explanations), IBM Plex Sans (UI & buttons), IBM Plex Mono (article numbers & timers).
- **Palette**: Paper Parchment (`#F3ECDD`), Deep Ink (`#16213A`), Legislature Saffron (`#D9731A`), Judiciary Green (`#1E6B49`), Chakra Navy (`#243B8C`).
- **Tactile Styling**: 2px ink borders, 3px hard offset shadows (no blur), rubber-stamp press physics, 24-spoke Ashoka Chakra, and synthesized mechanical sound effects.
