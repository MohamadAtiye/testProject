import { writeFile } from "node:fs/promises";
import path from "node:path";
import { buildApp } from "../app.js";

const app = await buildApp({ logger: false });

try {
  await app.ready();
  const spec = app.swagger();
  const file = path.resolve(process.cwd(), "openapi.json");
  await writeFile(file, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
  console.log(`[openapi] wrote ${file}`);
} finally {
  await app.close();
}
