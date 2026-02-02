# Repository Guidelines

## Project Structure & Module Organization
- `package.json` is currently the only tracked file and defines the package metadata and scripts.
- The entry point is `index.js` per `package.json` (`"main": "index.js"`), but the file does not yet exist. Add it at the repo root when implementing runtime code.
- There are no dedicated `src/`, `test/`, or `assets/` directories yet. If you introduce them, keep top-level layout simple (for example: `src/` for code, `test/` for tests).

## Build, Test, and Development Commands
- `pnpm install`: install dependencies once they are added.
- `pnpm test`: currently fails with a placeholder message. Replace this script once a test runner is added.
- No build or dev scripts are defined. Add scripts like `build`, `lint`, or `dev` as the project grows.

## Coding Style & Naming Conventions
- No linting or formatting tools are configured yet.
- If you add tooling, keep conventions consistent and document them here (for example, 2-space indentation for JS, `camelCase` for variables, `PascalCase` for classes).
- Prefer clear file names aligned with functionality (for example, `src/runner.js`, `src/config.js`).

## Testing Guidelines
- No test framework is configured.
- If you add tests, include a runner in `package.json` (for example, `vitest` or `jest`) and document test locations (for example, `test/` or `src/**/*.test.js`).
- Use explicit test names and keep tests close to the code they validate.

## Commit & Pull Request Guidelines
- This repository is not currently a git repo, so there is no commit history to infer conventions.
- If you initialize git, adopt concise commit messages (for example, `feat: add runner entry point`) and include a short PR description with scope, testing notes, and any follow-up work.

## Security & Configuration Tips
- Avoid committing secrets. Store environment-specific settings in local config files (for example, `.env`) and document required variables in the README when added.
