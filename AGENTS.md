# Repository Guidelines

## Project Structure & Module Organization
- `src/server/` holds the Node server (Express) entry at `src/server/index.ts`.
- `src/ui/` contains the React SPA with `src/ui/index.html`, `src/ui/main.tsx`, and shared styles in `src/ui/styles.css`.
- `src/ui/components/` contains UI components. Components must be separated into their own files (one component per file).
- `src/shared/` is reserved for cross-cutting logic (config parsing, shared types).
- `jrunner-conf.json` is the main config; `.jrunner-conf-overrides.json` is optional for local overrides (gitignored).
- `jrunner-conf.template.json` is a template reference.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies.
- `pnpm dev`: run server (`tsx watch`) and UI (Vite) together.
- `pnpm dev:server`: run the Express server in watch mode.
- `pnpm dev:ui`: run the Vite dev server.
- `pnpm build`: build UI + server + CLI.
- `pnpm start`: start the server (expects a production UI build).
- `pnpm test`: placeholder until a test runner is added.

## Coding Style & Naming Conventions
- No linting or formatting tools are configured yet.
- If you add tooling, keep conventions consistent and document them here (for example, 2-space indentation for JS, `camelCase` for variables, `PascalCase` for classes).
- Prefer clear file names aligned with functionality (for example, `src/ui/components/ScriptCard.tsx`).

## Testing Guidelines
- No test framework is configured.
- If you add tests, include a runner in `package.json` (for example, `vitest` or `jest`) and document test locations (for example, `test/` or `src/**/*.test.js`).
- Use explicit test names and keep tests close to the code they validate.

## Commit & Pull Request Guidelines
- This repository is not currently a git repo, so there is no commit history to infer conventions.
- If you initialize git, adopt concise commit messages (for example, `feat: add runner entry point`) and include a short PR description with scope, testing notes, and any follow-up work.

## Security & Configuration Tips
- Avoid committing secrets. Store environment-specific settings in local config files (for example, `.env`) and document required variables in the README when added.
- `.jrunner-conf-overrides.json` must be in `.gitignore`.

## Config Snippets

Minimal `jrunner-conf.json`:\n
```json
{
  "pannels": {
    "name": "Default",
    "prepare": [],
    "description": "",
    "columns": [
      { "id": "custom", "name": "custom scripts" }
    ],
    "customScripts": [
      {
        "name": "lint",
        "command": ["pnpm lint"],
        "description": "Run lint",
        "color": "slate",
        "columnId": "custom"
      }
    ]
  }
}
```

Minimal `.jrunner-conf-overrides.json`:\n
```json
{
  "pannels": {
    "name": "Default",
    "prepare": [],
    "description": "",
    "columns": [
      { "id": "custom", "name": "custom scripts" }
    ],
    "customScripts": [
      { "name": "lint", "hidden": true }
    ]
  }
}
```
