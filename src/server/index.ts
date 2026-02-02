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
    confJson.pannels = { name: "Default", prepare: [], description: "", customScripts: [] };
  }
  if (!Array.isArray(confJson.pannels.customScripts)) {
    confJson.pannels.customScripts = [];
  }
  return confJson;
}

async function readPackage(packageJsonPath: string) {
  const raw = await fs.readFile(packageJsonPath, "utf-8");
  return JSON.parse(raw);
}

async function writePackage(packageJsonPath: string, json: any) {
  await fs.writeFile(packageJsonPath, JSON.stringify(json, null, 2));
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/scripts", async (_req, res) => {
  try {
    const root = process.cwd();
    const packageJsonPath = path.join(root, "package.json");
    const confPath = path.join(root, "jrunner-conf.json");

    const packageRaw = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageRaw);
    const packageScripts = packageJson?.scripts ?? {};

    let customScripts = [];
    let initialized = true;
    try {
      const confRaw = await fs.readFile(confPath, "utf-8");
      const confJson = JSON.parse(confRaw);
      const panel = confJson?.pannels;
      customScripts = Array.isArray(panel?.customScripts) ? panel.customScripts : [];
    } catch {
      initialized = false;
      customScripts = [];
    }

    res.json({
      packageScripts,
      customScripts,
      initialized
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
          customScripts: []
        }
      };
      await fs.writeFile(confPath, JSON.stringify(emptyConfig, null, 2));
      return res.json({ initialized: true });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to initialize" });
  }
});

app.post("/api/custom-scripts", async (req, res) => {
  try {
    const root = process.cwd();
    const confPath = path.join(root, "jrunner-conf.json");

    const { name, description, command } = req.body ?? {};
    if (!name || !command || !Array.isArray(command) || command.length === 0) {
      return res.status(400).json({ error: "Invalid custom script payload" });
    }

    let confJson = await readConfig(confPath);
    confJson = normalizeConfig(confJson);

    confJson.pannels.customScripts.push({
      name,
      command,
      description: description || ""
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

    const { originalName, name, description, command } = req.body ?? {};
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
      description: description || ""
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

if (isProd) {
  void serveUiIfBuilt();
} else {
  void serveUiIfBuilt();
}

app.listen(port, () => {
  console.log(`jrunner server listening on http://localhost:${port}`);
});
