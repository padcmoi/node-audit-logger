import { join } from "node:path";
import { AuditLoggerService } from "@naskot/node-audit-logger";

const logger = {
  info: (message: string, meta?: unknown) => console.info(message, meta ?? ""),
  warn: (message: string, meta?: unknown) => console.warn(message, meta ?? ""),
  error: (message: string, meta?: unknown) => console.error(message, meta ?? ""),
};

export const requestAudit = new AuditLoggerService({
  mode: "request",
  logPath: join(__dirname, "../audit/logs/request-audit.log"),
  archiveMode: "daily",
  logger,
});

export const securityAudit = new AuditLoggerService({
  mode: "security",
  logPath: join(__dirname, "../audit/logs/security-audit.log"),
  archiveMode: "daily",
  logger,
});

export const debugAudit = new AuditLoggerService({
  mode: "debug",
  logPath: join(__dirname, "../audit/logs/debug-audit.log"),
  enabled: true,
  archiveMode: "none",
  logger,
});
