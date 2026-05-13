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
npm run dev:auth
```

The repo declares `pnpm@10.26.0`, so the equivalent commands are:

```bash
pnpm install
pnpm dev:auth
```

Fill `.env.local` with the Liberland client API key. Do not commit `.env.local`.

## Local SSO Callback Bridge

The existing backend returns mobile deep-link callbacks after SSO, for example:

```text
cz.liberland.services.dev://auth_callback?...
```

A browser cannot consume that custom scheme directly, so local development uses a
small macOS protocol bridge:

```bash
npm run auth:register-protocol
```

This creates `~/Applications/Liberland Auth Bridge.app` and registers the
`cz.liberland.services.dev` and `cz.liberland.services` URL schemes. When the
SSO bridge opens the mobile callback, macOS hands it to this local app, which
forwards the same query string to:

```text
http://localhost:3000/api/auth/callback
```

No backend redirect changes are required.

The bridge also starts `npm run dev` automatically if the callback arrives while
the local server is down.

If a browser refuses to hand off the custom URL scheme, open:

```text
http://localhost:3000/auth/rescue
```

and paste the current Liberland `/auth/callback?...` URL. The local BFF will ask
the existing backend callback for its mobile payload and finish the session
locally.

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
npm run test:e2e
```

## Tauri Notes

This app currently depends on Next route handlers for the BFF, so a future Tauri wrapper should either:

- run the Next server locally and point the Tauri webview at it, or
- host the BFF and configure the Tauri shell to use that hosted URL.

Static export alone is not enough for the authenticated real-data MVP because auth cookies and upstream proxying require server routes.
