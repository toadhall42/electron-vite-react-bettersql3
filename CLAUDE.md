# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Electron · Vite · React 19 · TanStack Router · TanStack Query · TanStack Table · Drizzle ORM · better-sqlite3 · Tailwind CSS v4 · shadcn/ui · Zod · Zustand

## Commands

```bash
npm run dev          # start Electron app with HMR (also runs electron-rebuild)
npm run build        # production build → output in release/
npm run db:generate  # generate Drizzle migration files from schema changes
npm run db:migrate   # apply pending migrations against __database/
npm run db:push      # push schema directly without a migration file (dev only)
```

**Setup from scratch:** copy `.env.example` → `.env`, then `npm install && npm run db:generate && npm run dev`.

## Architecture

### Process boundary

All SQLite access lives exclusively in the **Electron main process**. The renderer never touches better-sqlite3 directly — it always goes through IPC.

```
Renderer (React)
  └─ window.api.db({ path, params })   ← injected by preload via contextBridge
        └─ ipcRenderer.invoke(path, params)
              └─ ipcMain.handle(path, ...)  ← registered in electron/main/db/handlers/
                    └─ Service layer (Drizzle queries)
```

`window.api` also exposes `fs`, `update`, `logger`, and `createWindow`. All types are declared in `global.d.ts`.

### Adding a new entity (e.g. "Widget")

1. **Schema** — `electron/main/db/schema/widget.ts` — define the table + Zod models (`WidgetModel`, `InsertWidgetModel`, `UpdateWidgetModel`) and export types. Re-export from `schema/index.ts`.
2. **Service** — `electron/main/db/services/widget.service.ts` — plain functions using the `db` instance from `db-connect.ts`.
3. **Handler** — `electron/main/db/handlers/widget.handler.ts` — `ipcMain.handle("db/widget/...")` wrappers. Re-export from `handlers/index.ts`.
4. **Generate migration** — `npm run db:generate`, then restart dev.
5. **Renderer API** — `src/lib/api/widget.ts` — thin wrappers over `window.api.db<Widget>({ path: "db/widget/...", params })`.
6. **Route + page** — add `src/routes/widget.tsx` (file-based, auto-picked up by TanStack Router plugin); component lives in `src/pages/widget.tsx`. Add a link to the nav in `src/components/layouts/root-layout.tsx`.

### Key file locations

| Concern | Path |
|---|---|
| Electron entry | `electron/main/index.ts` |
| Preload / contextBridge | `electron/preload/index.ts` |
| DB connect + migrate | `electron/main/db/db-connect.ts` |
| Drizzle schema | `electron/main/db/schema/` |
| IPC handlers | `electron/main/db/handlers/` |
| Renderer API wrappers | `src/lib/api/` |
| Custom hooks | `src/lib/hooks/` |
| Route tree (auto-generated) | `src/routeTree.gen.ts` — do not edit manually |
| DB file (dev) | `./__database/<app-name>.db` |
| Migrations | `./migrations/` |

### Path aliases

`@` → `./src`, `@assets` → `./assets`

### IPC response shape

All handlers return `QueryResponse<T>` from `global.d.ts`: `{ code: number; message: string; data: T | null }`. Use `response.ok(...)` and `toErrorResponse(err)` from `electron/main/utils/response.ts` — do not return raw objects.

### Routing

TanStack Router uses file-based routing. The `@tanstack/router-plugin/vite` plugin auto-generates `src/routeTree.gen.ts` on every dev rebuild. Add new routes as files in `src/routes/`; do not edit `routeTree.gen.ts`.

### Production build notes

- `console` and `debugger` calls are stripped in production builds (`vite.config.ts` `build.drop`).
- In production, migrations run from `process.resourcesPath/migrations` (bundled by electron-builder); in dev they run from the repo `./migrations/` folder.
- `better-sqlite3` is listed as an external in the main-process Rollup config and must be rebuilt for the target Electron version via `@electron/rebuild`.
