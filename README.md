# @naskot/node-audit-logger

Node.js audit logger based on reusable instances.

- One instance = one `logPath` + one `mode` (`request`, `security`, `debug`)
- `archiveMode` per instance (`daily` or `none`)
- Request middleware compatible with Express signature
- Security and debug line writers
- Purge support for active logs + optional archive cleanup

## Install

```bash
npm i @naskot/node-audit-logger
```

## Official Documentation

- Core usage + templates: [docs/helpers.md](./docs/helpers.md)
- Express integration: [docs/express.md](./docs/express.md)
- NestJS integration: [docs/nestjs.md](./docs/nestjs.md)

## Quick Start

### 1) Create instances in `src/services/audit.service.ts`

```ts
import { join } from "node:path";
import { AuditLoggerService } from "@naskot/node-audit-logger";

export const requestAudit = new AuditLoggerService({
  mode: "request",
  logPath: join(process.cwd(), "data", "logs", "request-audit.log"),
  archiveMode: "daily",
});

export const securityAudit = new AuditLoggerService({
  mode: "security",
  logPath: join(process.cwd(), "data", "logs", "security-audit.log"),
  archiveMode: "daily",
});

export const debugAudit = new AuditLoggerService({
  mode: "debug",
  logPath: join(process.cwd(), "data", "logs", "debug-audit.log"),
  enabled: process.env.DISPLAY_DEBUG === "1",
  archiveMode: "none",
});
```

### 2) Bootstrap at app/API startup

```ts
requestAudit.bootstrapSingleton();
securityAudit.bootstrapSingleton();
debugAudit.bootstrapSingleton();
```

### 3) Use each mode

```ts
app.use(requestAudit.requestAudit);

app.post("/internal/security", (req, res) => {
  securityAudit.securityAudit(req, "reason=token_invalid client=hmac");
  debugAudit.debugAudit(`[${req.method}]${req.originalUrl} denied`);
  res.json({ ok: true });
});
```

### 4) Purge and archive cleanup

```ts
const archiveMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

requestAudit.purgeOldLogs();
requestAudit.purgeOldArchives({ maxAgeMs: archiveMaxAgeMs });

securityAudit.purgeOldLogs();
securityAudit.purgeOldArchives({ maxAgeMs: archiveMaxAgeMs });

debugAudit.purgeOldLogs();
```

## Factory Helpers (starter-template style)

```ts
import { createDebugAudit, createRequestAudit, createSecurityAudit } from "@naskot/node-audit-logger";

const requestAudit = createRequestAudit({ archiveMode: "daily" });
const securityAudit = createSecurityAudit({ archiveMode: "daily" });
const debugAudit = createDebugAudit({ enabled: true, archiveMode: "none" });
```

## Local checks

```bash
npm run lint
npm run check
npm test
npm run build
```

## POC

A minimal Express proof exists in [`poc/`](./poc):

```bash
cd poc
pnpm install
pnpm dev
pnpm build
node dist/index.js
```
