# NestJS Integration

## Service Path

- `src/services/audit.service.ts`

```ts
import { Injectable } from "@nestjs/common";
import { join } from "node:path";
import { AuditLoggerService } from "@naskot/node-audit-logger-core";

@Injectable()
export class AppAuditService {
  readonly requestAudit = new AuditLoggerService({
    mode: "request",
    logPath: join(__dirname, "../audit/logs/request-audit.log"),
    archiveMode: "daily",
  });

  readonly securityAudit = new AuditLoggerService({
    mode: "security",
    logPath: join(__dirname, "../audit/logs/security-audit.log"),
    archiveMode: "daily",
  });

  readonly debugAudit = new AuditLoggerService({
    mode: "debug",
    logPath: join(__dirname, "../audit/logs/debug-audit.log"),
    enabled: process.env.DISPLAY_DEBUG === "1",
    archiveMode: "none",
  });

  bootstrap() {
    this.requestAudit.bootstrapSingleton();
    this.securityAudit.bootstrapSingleton();
    this.debugAudit.bootstrapSingleton();
  }
}
```

## Global Middleware

```ts
import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { AppAuditService } from "./services/audit.service";

@Injectable()
export class RequestAuditMiddleware implements NestMiddleware {
  constructor(private readonly audit: AppAuditService) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.audit.requestAudit.requestAudit(req, res, next);
  }
}
```

## Security/Debug Usage in Guard or Controller

```ts
this.audit.securityAudit.securityAudit(req, "reason=invalid_hmac client=internal");
this.audit.debugAudit.debugAudit(`blocked route=${req.originalUrl}`);
```

## Scheduled Purge (example)

```ts
const archiveMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

this.audit.requestAudit.purgeOldLogs();
this.audit.requestAudit.purgeOldArchives({ maxAgeMs: archiveMaxAgeMs });

this.audit.securityAudit.purgeOldLogs();
this.audit.securityAudit.purgeOldArchives({ maxAgeMs: archiveMaxAgeMs });

this.audit.debugAudit.purgeOldLogs();
```
