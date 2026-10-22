# Samvidhan (Sansthaein Aur Samvidhan)

Interactive Constitution of India platform featuring offline civic learning modes, physical spinning wheel, classroom live multiplayer quizzes, and an Electron desktop app with projector view.

## Architecture

- `packages/core`: Pure TypeScript game engine, 26 articles (Parts V & VI) with 78 verified questions, deterministic seeded wheel physics (`mulberry32`), scoring engine, and Snakes & Ladders state machine.
- `packages/protocol`: Shared Socket.IO event types and Zod schemas.
- `apps/server`: Fastify + Socket.IO real-time multiplayer backend with anti-cheat answer stripping and authoritative clock sync.
- `apps/web`: Responsive React + Vite web client (Learn, Quiz, Spin the Wheel, Flash Cards, Snakes & Ladders, Live Player & Host Console).
- `apps/desktop`: Native Electron desktop app with macOS window chrome, projector mode, and DMG packaging.
