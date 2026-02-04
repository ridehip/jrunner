# jrunner

Web UI for running project scripts. Run with `npx jrunner` to launch a local server and browser UI that lists `package.json` scripts plus custom scripts from `jrunner-conf.json`.

## Quick Start

```bash
pnpm install
pnpm dev
```

- UI (dev): `http://localhost:5173`
- API: `http://localhost:3000`

Production build:

```bash
pnpm build
node dist/cli/index.js
```

## Configuration

### jrunner-conf.json

Minimal example:

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

Expanded example (multiple columns and colors):

```json
{
  "pannels": {
    "name": "Default",
    "prepare": ["pnpm install"],
    "description": "Local dev panel",
    "columns": [
      { "id": "custom", "name": "custom scripts" },
      { "id": "build", "name": "build" },
      { "id": "deploy", "name": "deploy" }
    ],
    "customScripts": [
      {
        "name": "typecheck",
        "command": ["pnpm typecheck"],
        "description": "Run TypeScript checks",
        "color": "sky",
        "columnId": "custom"
      },
      {
        "name": "build:ui",
        "command": ["pnpm build:ui"],
        "description": "Build the UI bundle",
        "color": "amber",
        "columnId": "build"
      },
      {
        "name": "deploy:staging",
        "command": ["pnpm build", "pnpm deploy:staging"],
        "description": "Staging deploy",
        "color": "rose",
        "columnId": "deploy"
      }
    ]
  }
}
```

### .jrunner-conf-overrides.json

Overrides are optional and should be gitignored. Use this to hide or tweak scripts locally.

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
        "hidden": true
      }
    ]
  }
}
```

## CLI

Install and run locally:

```bash
pnpm build
npm link
```

Then from another project:

```bash
npm link jrunner
jrunner
```

## Development Notes

- Server: `src/server/index.ts`
- UI: `src/ui/`
- CLI entry: `src/cli/index.ts`

## License

ISC
