import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function addShebang(file) {
  const raw = await readFile(file, "utf-8");
  if (raw.startsWith("#!/usr/bin/env node")) {
    return;
  }
  await writeFile(file, `#!/usr/bin/env node\n${raw}`);
}

const cliPath = path.join(process.cwd(), "dist", "cli", "index.js");
await addShebang(cliPath);
