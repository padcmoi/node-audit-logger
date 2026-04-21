# Express Integration

## Service Path

- `src/services/audit.service.ts`

```ts
import { join } from "node:path";
import { AuditLoggerService } from "@naskot/node-audit-logger-core";

export const requestAudit = new AuditLoggerService({
  mode: "request",
  logPath: join(__dirname, "../audit/logs/request-audit.log"),
  archiveMode: "daily",
});

export const securityAudit = new AuditLoggerService({
  mode: "security",
  logPath: join(__dirname, "../audit/logs/security-audit.log"),
  archiveMode: "daily",
});

export const debugAudit = new AuditLoggerService({
  mode: "debug",
  logPath: join(__dirname, "../audit/logs/debug-audit.log"),
  enabled: process.env.DISPLAY_DEBUG === "1",
  archiveMode: "none",
});
```

## App Bootstrap

```ts
import express from "express";
import { debugAudit, requestAudit, securityAudit } from "./services/audit.service";

const app = express();

requestAudit.bootstrapSingleton();
securityAudit.bootstrapSingleton();
debugAudit.bootstrapSingleton();

app.use(requestAudit.requestAudit);
```

## Security and Debug Usage

```ts
app.post("/api/internal/secure", (req, res) => {
  securityAudit.securityAudit(req, "reason=forbidden_scope client=api");
  debugAudit.debugAudit(`[${req.method}]${req.originalUrl} denied`);

  res.status(403).json({ ok: false });
});
```

## Daily Purge Example

```ts
const archiveMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

requestAudit.purgeOldLogs();
requestAudit.purgeOldArchives({ maxAgeMs: archiveMaxAgeMs });
securityAudit.purgeOldLogs();
securityAudit.purgeOldArchives({ maxAgeMs: archiveMaxAgeMs });
debugAudit.purgeOldLogs();
```
