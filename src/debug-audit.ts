import { DEFAULT_DEBUG_AUDIT_LOG_PATH } from "./constants";
import { AuditLoggerService } from "./service";
import type { DebugAuditFactoryOptions } from "./types";

export function createDebugAudit(options: DebugAuditFactoryOptions = {}) {
  const service = new AuditLoggerService({
    mode: "debug",
    logPath: options.logPath ?? DEFAULT_DEBUG_AUDIT_LOG_PATH,
    enabled: options.enabled ?? true,
    archiveMode: options.archiveMode ?? "none",
    purgeMaxAgeMs: options.purgeMaxAgeMs,
    logger: options.logger,
    nowMs: options.nowMs,
    dateIso: options.dateIso,
  });

  return {
    bootstrapSingleton: service.bootstrapSingleton,
    debugAudit: service.debugAudit,
    purgeOldLogs: service.purgeOldLogs,
    readLog: service.readLog,
    waitForIdle: service.waitForIdle,
  };
}
