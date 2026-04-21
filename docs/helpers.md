# Audit Logger Usage Guide

This package is instance-oriented.

- One instance handles one file
- You choose mode per instance
- You choose archive behavior per instance

## Instance Template

Service file path:

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

## Startup

```ts
requestAudit.bootstrapSingleton();
securityAudit.bootstrapSingleton();
debugAudit.bootstrapSingleton();
```

## Request Mode

```ts
app.use(requestAudit.requestAudit);
```

Line format:

```txt
2026-04-20T12:00:00.000Z 170.2.1.28 proto=https method=POST url=/api/test status=200 duration=12ms
```

## Security Mode

```ts
securityAudit.securityAudit(req, "reason=invalid_signature client=hmac");
```

Line format:

```txt
2026-04-20T12:00:00.000Z 170.2.1.28 proto=https method=POST url=/api/test reason=invalid_signature client=hmac
```

## Debug Mode

```ts
debugAudit.debugAudit("authority sync done");
```

## Archive Mode

- `archiveMode: "daily"` stores removed lines in `archives/<base>.YYYY-MM-DD.log` during purge.
- `archiveMode: "none"` only rewrites the active log file.

## Purge Template

```ts
const archiveMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

requestAudit.purgeOldLogs();
requestAudit.purgeOldArchives({ maxAgeMs: archiveMaxAgeMs });

securityAudit.purgeOldLogs();
securityAudit.purgeOldArchives({ maxAgeMs: archiveMaxAgeMs });

debugAudit.purgeOldLogs();
```

## Factory Helpers

```ts
import { createDebugAudit, createRequestAudit, createSecurityAudit } from "@naskot/node-audit-logger-core";

const requestAudit = createRequestAudit({ archiveMode: "daily" });
const securityAudit = createSecurityAudit({ archiveMode: "daily" });
const debugAudit = createDebugAudit({ enabled: true, archiveMode: "none" });
```
