# ВетДом

Imported from https://github.com/arondrotsild-lab/veterinarathome. The original project is preserved under `artifacts/veterinarathome/`, including `client/`, `server/`, `attached_assets/`, `start.sh`, lockfiles, and its own `replit.md`.

## Run & Operate

- Managed web workflow runs `pnpm --filter @workspace/veterinarathome run dev`.
- The import's own setup: `npm run install:all` from `artifacts/veterinarathome/` installs the separate client and server lockfiles; `npm run dev` starts the existing script.
- The existing Vite client proxies `/api` to the existing Express server. The server initializes its PostgreSQL tables on startup.
- Required environment: Replit-managed `DATABASE_URL` and `SESSION_SECRET` (or `JWT_SECRET`). Google Maps is optional.
- Verify builds with `npm run build --prefix artifacts/veterinarathome/client` and `npm run build --prefix artifacts/veterinarathome/server`.

## Stack

The imported app retains React + Vite + Tailwind in `client/` and Express + TypeScript + PostgreSQL in `server/`. Consult `artifacts/veterinarathome/replit.md` for its product context.

## Where things live

- Imported application: `artifacts/veterinarathome/`
- Existing client: `artifacts/veterinarathome/client/`
- Existing server: `artifacts/veterinarathome/server/`
- Imported assets: `artifacts/veterinarathome/attached_assets/`

## Architecture decisions

- Keep the imported client and server in place rather than reimplementing them in the starter workspace's sample API and frontend. The starter API has been moved off `/api` so the imported Vite proxy can reach its own server.

## Product

ВетДом allows customers to arrange home veterinary visits.

## User preferences

- Preserve the imported app's structure and source; change only what is needed to run it.

## Gotchas

- The starter root workspace package is not the imported app. Use the import's own npm scripts for its client and server dependencies.

## Pointers

- See `artifacts/veterinarathome/replit.md` and the original `start.sh`.
