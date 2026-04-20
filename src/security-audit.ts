import { DEFAULT_SECURITY_AUDIT_LOG_PATH } from "./constants";
import { AuditLoggerService } from "./service";
import type { SecurityAuditFactoryOptions } from "./types";

export function createSecurityAudit(options: SecurityAuditFactoryOptions = {}) {
  const service = new AuditLoggerService({
    mode: "security",
    logPath: options.logPath ?? DEFAULT_SECURITY_AUDIT_LOG_PATH,
    archiveMode: options.archiveMode ?? "daily",
    purgeMaxAgeMs: options.purgeMaxAgeMs,
    logger: options.logger,
    resolveRemoteIp: options.resolveRemoteIp,
    nowMs: options.nowMs,
    dateIso: options.dateIso,
  });

  return {
    bootstrapSingleton: service.bootstrapSingleton,
    securityAudit: service.securityAudit,
    purgeOldLogs: service.purgeOldLogs,
    purgeOldArchives: service.purgeOldArchives,
    readLog: service.readLog,
    waitForIdle: service.waitForIdle,
  };
}
