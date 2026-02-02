import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uiDir = path.resolve(__dirname, "../../dist/ui");

  app.use(express.static(uiDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(uiDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`jrunner server listening on http://localhost:${port}`);
});
