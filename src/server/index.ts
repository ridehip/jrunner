import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

type RunRecord = {
  id: string;
  name: string;
  command: string;
  logs: { type: "stdout" | "stderr"; data: string }[];
  listeners: Set<express.Response>;
  child?: ReturnType<typeof spawn>;
};

const runs = new Map<string, RunRecord>();

async function readConfig(confPath: string) {
  try {
    const confRaw = await fs.readFile(confPath, "utf-8");
    return JSON.parse(confRaw);
  } catch {
    return { pannels: { name: "Default", prepare: [], description: "", customScripts: [] } };
  }
}

function normalizeConfig(confJson: any) {
  if (!confJson.pannels) {
    confJson.pannels = {
      name: "Default",
      prepare: [],
      description: "",
      customScripts: [],
      columns: [{ id: "custom", name: "custom scripts" }]
    };
  }
  if (!Array.isArray(confJson.pannels.customScripts)) {
    confJson.pannels.customScripts = [];
  }
  if (!Array.isArray(confJson.pannels.columns)) {
    confJson.pannels.columns = [{ id: "custom", name: "custom scripts" }];
  }
  return confJson;
}

async function readOverrides(overridesPath: string) {
  const raw = await fs.readFile(overridesPath, "utf-8");
  return JSON.parse(raw);
}

function normalizeOverrides(confJson: any) {
  if (!confJson.pannels) {
    confJson.pannels = {
      name: "Default",
      prepare: [],
      description: "",
      customScripts: [],
      columns: []
    };
  }
  if (!Array.isArray(confJson.pannels.customScripts)) {
    confJson.pannels.customScripts = [];
  }
  if (!Array.isArray(confJson.pannels.columns)) {
    confJson.pannels.columns = [];
  }
  return confJson;
}

function mergeCustomScripts(base: any[], overrides: any[]) {
  const overrideMap = new Map(overrides.map((script) => [script.name, script]));
  return base.map((script) => {
    const override = overrideMap.get(script.name);
    if (!override) {
      return script;
    }
    return {
      ...script,
      description: override.description ?? script.description,
      command: Array.isArray(override.command) && override.command.length > 0
        ? override.command
        : script.command,
      hidden: override.hidden ?? script.hidden,
      color: override.color ?? script.color,
      columnId: override.columnId ?? script.columnId
    };
  });
}
async function readPackage(packageJsonPath: string) {
  const raw = await fs.readFile(packageJsonPath, "utf-8");
  return JSON.parse(raw);
}

async function writePackage(packageJsonPath: string, json: any) {
  await fs.writeFile(packageJsonPath, JSON.stringify(json, null, 2));
}

async function ensureGitignoreEntry(root: string) {
  const gitignorePath = path.join(root, ".gitignore");
  const entry = ".jrunner-conf-overrides.json";
  const comment = "# jrunner overrides";
  let content = "";
  try {
    content = await fs.readFile(gitignorePath, "utf-8");
  } catch {
    content = "";
  }
  if (content.includes(entry)) {
    return;
  }
  const suffix = `${content.endsWith("\n") || content.length === 0 ? "" : "\n"}\n${comment}\n${entry}\n`;
  await fs.writeFile(gitignorePath, content + suffix);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/scripts", async (_req, res) => {
  try {
    const root = process.cwd();
    const packageJsonPath = path.join(root, "package.json");
    const confPath = path.join(root, "jrunner-conf.json");
    const overridesPath = path.join(root, ".jrunner-conf-overrides.json");

    const packageRaw = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageRaw);
    const packageScripts = packageJson?.scripts ?? {};

    let customScripts = [];
    let columns = [{ id: "custom", name: "custom scripts" }];
    let initialized = true;
    try {
      const confRaw = await fs.readFile(confPath, "utf-8");
      const confJson = normalizeConfig(JSON.parse(confRaw));
      const panel = confJson?.pannels;
      customScripts = Array.isArray(panel?.customScripts) ? panel.customScripts : [];
      columns = Array.isArray(panel?.columns) && panel.columns.length > 0
        ? panel.columns
        : columns;
    } catch {
      initialized = false;
      customScripts = [];
    }

    let overridesPresent = true;
    let hiddenScripts: string[] = [];
    let overridesScripts: any[] = [];
    try {
      const overridesRaw = await readOverrides(overridesPath);
      const overridesJson = normalizeOverrides(overridesRaw);
      overridesScripts = overridesJson?.pannels?.customScripts ?? [];
      if (Array.isArray(overridesJson?.pannels?.columns) && overridesJson.pannels.columns.length > 0) {
        columns = overridesJson.pannels.columns;
      }
      hiddenScripts = overridesScripts
        .filter((script) => script?.hidden)
        .map((script) => script?.name)
        .filter(Boolean);
    } catch {
      overridesPresent = false;
      overridesScripts = [];
      hiddenScripts = [];
    }

    customScripts = mergeCustomScripts(customScripts, overridesScripts).map((script) => ({
      ...script,
      columnId: script.columnId ?? "custom"
    }));

    res.json({
      packageScripts,
      customScripts,
      initialized,
      overridesPresent,
      hiddenScripts,
      columns
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load scripts" });
  }
});

app.post("/api/init", async (_req, res) => {
  try {
    const root = process.cwd();
    const confPath = path.join(root, "jrunner-conf.json");
    try {
      await fs.access(confPath);
      return res.json({ initialized: true });
    } catch {
      const emptyConfig = {
        pannels: {
          name: "Default",
          prepare: [],
          description: "",
          customScripts: [],
          columns: [{ id: "custom", name: "custom scripts" }]
        }
      };
      await fs.writeFile(confPath, JSON.stringify(emptyConfig, null, 2));
      return res.json({ initialized: true });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to initialize" });
  }
});

app.post("/api/overrides/hide", async (req, res) => {
  try {
    const root = process.cwd();
    const overridesPath = path.join(root, ".jrunner-conf-overrides.json");
    const { name, hidden } = req.body ?? {};
    if (!name || typeof hidden !== "boolean") {
      return res.status(400).json({ error: "Invalid override payload" });
    }

    let overridesJson;
    try {
      overridesJson = await readOverrides(overridesPath);
    } catch {
      overridesJson = {
        pannels: {
          name: "Default",
          prepare: [],
          description: "",
          customScripts: []
        }
      };
    }
    overridesJson = normalizeOverrides(overridesJson);

    const scripts = overridesJson.pannels.customScripts;
    const existing = scripts.find((script: any) => script.name === name);
    if (existing) {
      existing.hidden = hidden;
    } else {
      scripts.push({
        name,
        command: [],
        description: "",
        hidden
      });
    }

    await fs.writeFile(overridesPath, JSON.stringify(overridesJson, null, 2));
    await ensureGitignoreEntry(root);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update overrides" });
  }
});

app.post("/api/custom-scripts", async (req, res) => {
  try {
    const root = process.cwd();
    const confPath = path.join(root, "jrunner-conf.json");

    const { name, description, command, color, columnId } = req.body ?? {};
    if (!name || !command || !Array.isArray(command) || command.length === 0) {
      return res.status(400).json({ error: "Invalid custom script payload" });
    }

    let confJson = await readConfig(confPath);
    confJson = normalizeConfig(confJson);

    confJson.pannels.customScripts.push({
      name,
      command,
      description: description || "",
      color: color || "",
      columnId: columnId || "custom"
    });

    await fs.writeFile(confPath, JSON.stringify(confJson, null, 2));

    res.json({
      customScripts: confJson.pannels.customScripts
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to save custom script" });
  }
});

app.put("/api/custom-scripts", async (req, res) => {
  try {
    const root = process.cwd();
    const confPath = path.join(root, "jrunner-conf.json");

    const { originalName, name, description, command, color, columnId } = req.body ?? {};
    const commandValue = Array.isArray(command) ? command : null;
    if (!originalName || !name || !commandValue || commandValue.length === 0) {
      return res.status(400).json({ error: "Invalid custom script payload" });
    }

    let confJson = await readConfig(confPath);
    confJson = normalizeConfig(confJson);

    const scripts = confJson.pannels.customScripts;
    const index = scripts.findIndex((script: any) => script.name === originalName);
    if (index === -1) {
      return res.status(404).json({ error: "Custom script not found" });
    }

    scripts[index] = {
      name,
      command: commandValue,
      description: description || "",
      color: color || "",
      columnId: columnId || "custom"
    };

    await fs.writeFile(confPath, JSON.stringify(confJson, null, 2));
    res.json({ customScripts: confJson.pannels.customScripts });
  } catch (error) {
    res.status(500).json({ error: "Failed to update custom script" });
  }
});

app.delete("/api/custom-scripts", async (req, res) => {
  try {
    const root = process.cwd();
    const confPath = path.join(root, "jrunner-conf.json");
    const { name } = req.body ?? {};
    if (!name) {
      return res.status(400).json({ error: "Invalid custom script payload" });
    }

    let confJson = await readConfig(confPath);
    confJson = normalizeConfig(confJson);

    confJson.pannels.customScripts = confJson.pannels.customScripts.filter(
      (script: any) => script.name !== name
    );

    await fs.writeFile(confPath, JSON.stringify(confJson, null, 2));
    res.json({ customScripts: confJson.pannels.customScripts });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete custom script" });
  }
});

app.post("/api/package-scripts", async (req, res) => {
  try {
    const root = process.cwd();
    const packageJsonPath = path.join(root, "package.json");
    const { name, command, originalName } = req.body ?? {};
    const commandValue = Array.isArray(command) ? command.join(" && ") : command;
    if (!name || !commandValue || typeof commandValue !== "string") {
      return res.status(400).json({ error: "Invalid package script payload" });
    }

    let packageJson = await readPackage(packageJsonPath);
    const scripts = packageJson.scripts ?? {};
    if (originalName && scripts[originalName] && originalName !== name) {
      delete scripts[originalName];
    }
    scripts[name] = commandValue;
    packageJson = { ...packageJson, scripts };
    await writePackage(packageJsonPath, packageJson);

    res.json({ packageScripts: packageJson.scripts ?? {} });
  } catch (error) {
    res.status(500).json({ error: "Failed to save package script" });
  }
});

app.post("/api/columns", async (req, res) => {
  try {
    const root = process.cwd();
    const confPath = path.join(root, "jrunner-conf.json");
    const { name } = req.body ?? {};
    if (!name) {
      return res.status(400).json({ error: "Invalid column payload" });
    }

    let confJson = await readConfig(confPath);
    confJson = normalizeConfig(confJson);

    const baseId = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "column";
    let id = baseId;
    let suffix = 2;
    const existingIds = new Set(confJson.pannels.columns.map((col: any) => col.id));
    while (existingIds.has(id)) {
      id = `${baseId}-${suffix++}`;
    }

    confJson.pannels.columns.push({ id, name });
    await fs.writeFile(confPath, JSON.stringify(confJson, null, 2));

    res.json({
      columns: confJson.pannels.columns,
      customScripts: confJson.pannels.customScripts
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create column" });
  }
});

app.put("/api/columns/:id", async (req, res) => {
  try {
    const root = process.cwd();
    const confPath = path.join(root, "jrunner-conf.json");
    const { name } = req.body ?? {};
    const { id } = req.params;
    if (!name) {
      return res.status(400).json({ error: "Invalid column payload" });
    }

    let confJson = await readConfig(confPath);
    confJson = normalizeConfig(confJson);

    const column = confJson.pannels.columns.find((col: any) => col.id === id);
    if (!column) {
      return res.status(404).json({ error: "Column not found" });
    }
    column.name = name;
    await fs.writeFile(confPath, JSON.stringify(confJson, null, 2));

    res.json({
      columns: confJson.pannels.columns,
      customScripts: confJson.pannels.customScripts
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update column" });
  }
});

app.delete("/api/columns/:id", async (req, res) => {
  try {
    const root = process.cwd();
    const confPath = path.join(root, "jrunner-conf.json");
    const { id } = req.params;

    let confJson = await readConfig(confPath);
    confJson = normalizeConfig(confJson);

    confJson.pannels.columns = confJson.pannels.columns.filter((col: any) => col.id !== id);
    confJson.pannels.customScripts = confJson.pannels.customScripts.map((script: any) => ({
      ...script,
      columnId: script.columnId === id ? "custom" : script.columnId
    }));

    await fs.writeFile(confPath, JSON.stringify(confJson, null, 2));
    res.json({
      columns: confJson.pannels.columns,
      customScripts: confJson.pannels.customScripts
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete column" });
  }
});

app.post("/api/delete-script", async (req, res) => {
  try {
    const root = process.cwd();
    const packageJsonPath = path.join(root, "package.json");
    const confPath = path.join(root, "jrunner-conf.json");

    const { name, removeFromPackage, removeFromCustom } = req.body ?? {};
    if (!name || (!removeFromPackage && !removeFromCustom)) {
      return res.status(400).json({ error: "Invalid delete payload" });
    }

    let packageJson = await readPackage(packageJsonPath);
    if (removeFromPackage && packageJson.scripts && packageJson.scripts[name]) {
      const { [name]: _removed, ...rest } = packageJson.scripts;
      packageJson = { ...packageJson, scripts: rest };
      await writePackage(packageJsonPath, packageJson);
    }

    let confJson = await readConfig(confPath);
    confJson = normalizeConfig(confJson);
    if (removeFromCustom) {
      confJson.pannels.customScripts = confJson.pannels.customScripts.filter(
        (script: any) => script.name !== name
      );
      await fs.writeFile(confPath, JSON.stringify(confJson, null, 2));
    }

    res.json({
      packageScripts: packageJson.scripts ?? {},
      customScripts: confJson.pannels.customScripts ?? []
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete script" });
  }
});

app.post("/api/run", async (req, res) => {
  try {
    const { name, command } = req.body ?? {};
    const commandValue = Array.isArray(command) ? command.join(" && ") : command;
    if (!name || !commandValue || typeof commandValue !== "string") {
      return res.status(400).json({ error: "Invalid run payload" });
    }

    const id = randomUUID();
    const record: RunRecord = {
      id,
      name,
      command: commandValue,
      logs: [],
      listeners: new Set()
    };
    runs.set(id, record);

    const child = spawn(commandValue, {
      cwd: process.cwd(),
      shell: true,
      env: process.env
    });
    record.child = child;

    child.stdout.on("data", (chunk) => {
      const data = chunk.toString();
      record.logs.push({ type: "stdout", data });
      for (const listener of record.listeners) {
        listener.write(`data: ${JSON.stringify({ type: "stdout", data })}\n\n`);
      }
    });

    child.stderr.on("data", (chunk) => {
      const data = chunk.toString();
      record.logs.push({ type: "stderr", data });
      for (const listener of record.listeners) {
        listener.write(`data: ${JSON.stringify({ type: "stderr", data })}\n\n`);
      }
    });

    child.on("close", (code) => {
      for (const listener of record.listeners) {
        listener.write(`event: end\ndata: ${JSON.stringify({ code })}\n\n`);
      }
      record.listeners.clear();
    });

    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: "Failed to start script" });
  }
});

app.get("/api/runs/:id/stream", (req, res) => {
  const record = runs.get(req.params.id);
  if (!record) {
    return res.status(404).end();
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  for (const entry of record.logs) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  record.listeners.add(res);

  req.on("close", () => {
    record.listeners.delete(res);
  });
});

app.post("/api/runs/:id/stop", (req, res) => {
  const record = runs.get(req.params.id);
  if (!record || !record.child) {
    return res.status(404).json({ error: "Run not found" });
  }
  record.child.kill("SIGTERM");
  res.json({ ok: true });
});

const isProd = process.env.NODE_ENV === "production";
const forceServeUi = process.env.FORCE_SERVE_UI === "1";

async function serveUiIfBuilt() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uiDir = path.resolve(__dirname, "../../dist/ui");
  try {
    await fs.access(path.join(uiDir, "index.html"));
  } catch {
    return false;
  }
  app.use(express.static(uiDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(uiDir, "index.html"));
  });
  return true;
}

if (isProd || forceServeUi) {
  void serveUiIfBuilt();
}

app.listen(port, () => {
  console.log(`jrunner server listening on http://localhost:${port}`);
});
