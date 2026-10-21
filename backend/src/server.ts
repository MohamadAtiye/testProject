import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = await buildApp();

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({
    host: "0.0.0.0",
    port: config.PORT,
  });
} catch (error) {
  app.log.error({ err: error }, "server startup failed");
  process.exit(1);
}
