# Liberland Computer Frontend

Browser-first workspace for Liberland tasks, worktime, jobs, workspace, accounting, and property. The app uses Next.js App Router with route handlers as a backend-for-frontend, so browser code never receives the backend refresh token or client API key.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- TanStack Query for data and mutations
- Next route handlers for auth, BFF proxying, token refresh, and Matrix scrum send
- Local-first development; Tauri wrapper can be added after the web MVP is stable

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The repo declares `pnpm@10.26.0`, so the equivalent commands are:

```bash
pnpm install
pnpm dev
```

Fill `.env.local` with the Liberland client API key. Do not commit `.env.local`.

On macOS, if the installed Liberland app has already received the SSO callback,
use **Use installed app session** on the sign-in screen to import that local
session into this frontend.

## Implemented MVP Surface

- Auth start/callback/refresh/logout/session routes
- Allowlisted BFF proxy for tasks, work sessions, jobs, bids, workspace, work reports, accounting, property, supporting lookup endpoints, and chat notifications
- Desktop app shell with Dashboard, Tasks, Worktime, Jobs, Workspace, Accounting, and Property modules
- Worktime timer start/stop, session notes in local storage, scrum grouping, manual Matrix send, and open-app auto-send after 19:00 when Matrix auth is available
- Unit tests for task/session normalization and scrum grouping
- Playwright smoke test for local unauthenticated startup

## Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run start
npm run test:e2e
```

## Production Server

The app builds as a standalone Next.js server.

```bash
npm install
npm run build
npm run start
```

For a VPS/container host:

```bash
docker build -t liberland-computer-frontend .
docker run --env-file .env.production -p 3000:3000 liberland-computer-frontend
```

Production env must set `APP_BASE_URL` and `AUTH_CALLBACK_URL` to the public
HTTPS origin that serves this app, plus `CLIENT_API_KEY` or `BACKEND_API_KEY`.

## Tauri Notes

This app currently depends on Next route handlers for the BFF, so a future Tauri wrapper should either:

- run the Next server locally and point the Tauri webview at it, or
- host the BFF and configure the Tauri shell to use that hosted URL.

Static export alone is not enough for the authenticated real-data MVP because auth cookies and upstream proxying require server routes.
