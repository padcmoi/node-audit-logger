import express from "express";
import { debugAudit, requestAudit, securityAudit } from "./services/audit.service";

async function bootstrap() {
  requestAudit.bootstrapSingleton();
  securityAudit.bootstrapSingleton();
  debugAudit.bootstrapSingleton();

  const app = express();
  app.use(express.json());
  app.use(requestAudit.requestAudit);

  app.get("/", (_req, res) => {
    res.json({ ok: true, service: "node-audit-logger-poc" });
  });

  app.post("/debug", (req, res) => {
    const body = req.body as { message?: string } | undefined;
    const message = body?.message ?? "POC debug line";

    debugAudit.debugAudit(message);

    res.json({ ok: true, message });
  });

  app.post("/security", (req, res) => {
    const body = req.body as { reason?: string } | undefined;
    const reason = body?.reason ?? "reason=poc_test client=poc";

    securityAudit.securityAudit(req, reason);

    res.json({ ok: true, reason });
  });

  app.post("/purge", (_req, res) => {
    const archiveMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

    requestAudit.purgeOldLogs();
    requestAudit.purgeOldArchives({ maxAgeMs: archiveMaxAgeMs });

    securityAudit.purgeOldLogs();
    securityAudit.purgeOldArchives({ maxAgeMs: archiveMaxAgeMs });

    debugAudit.purgeOldLogs();

    res.json({ ok: true });
  });

  app.get("/logs/debug", (_req, res) => {
    const content = debugAudit.readLog();

    if (content === null) {
      return res.status(404).json({ ok: false, error: "DEBUG_LOG_NOT_FOUND" });
    }

    res.type("text/plain").send(content);
  });

  const server = app.listen(0, () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : "unknown";
    console.info(`POC audit logger started on port ${port}`);
  });

  const shutdown = () => {
    server.close();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void bootstrap();
