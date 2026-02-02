# Project Bootstrap TODO

## Goals
- `npx jrunner` starts a local Node server and opens a React single-page WUI.
- UI lists runnable scripts from `package.json` plus user overrides in `jrunner-conf.json`.
- Users can run scripts and view output in the browser.

## Milestone 1: Repo Setup
- Decide stack versions (Node LTS, React, Vite or similar bundler).
- Add baseline file structure:
  - `src/server/` (Node server)
  - `src/ui/` (React SPA)
  - `src/shared/` (types, config parsing)
- Initialize tooling: `pnpm`, `eslint`, `prettier`, `vitest` (or alternative).
- Add scripts to `package.json`: `dev`, `build`, `start`, `lint`, `test`.

## Milestone 2: CLI + Config
- Create CLI entry (`bin/jrunner`) that:
  - Resolves project root (where `package.json` lives).
  - Reads `jrunner-conf.json` with defaults + validation.
  - Starts server on an open port and prints URL.
- Define config schema (example fields):
  - `scripts.include`, `scripts.exclude`, `scripts.custom`
  - `ui.theme`, `ui.title`
  - `server.port`, `server.openBrowser`
- Add example config to docs and a template file.

## Milestone 3: Script Discovery + Execution
- Parse `package.json` scripts and merge with config overrides.
- Normalize command metadata (name, command, group, description).
- Implement safe execution:
  - Spawn processes via Node `child_process`.
  - Stream stdout/stderr to UI over WebSocket or SSE.
  - Track status (running, success, failed, exit code).
- Add safeguards (avoid running arbitrary commands outside root).

## Milestone 4: Server API
- REST endpoints:
  - `GET /api/scripts` (list)
  - `POST /api/run` (start run)
  - `POST /api/stop` (stop run)
- Real-time channel for logs and status updates.
- Serve built SPA from server in production.

## Milestone 5: React SPA
- Script list view with search/filter.
- Run detail pane with live logs.
- Controls: run, stop, clear output.
- Basic theming and layout responsive for desktop.

## Milestone 6: Packaging + Release
- Build pipeline: UI build + server bundle.
- Ensure `npx jrunner` installs and runs correctly.
- Add README with usage, config, and screenshots.

## Milestone 7: Testing
- Unit tests for config parsing and script merging.
- Integration tests for API endpoints.
- Smoke test: run script and capture output.
