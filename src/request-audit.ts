import { DEFAULT_REQUEST_AUDIT_LOG_PATH } from "./constants";
import { AuditLoggerService } from "./service";
import type { RequestAuditFactoryOptions } from "./types";

export function createRequestAudit(options: RequestAuditFactoryOptions = {}) {
  const service = new AuditLoggerService({
    mode: "request",
    logPath: options.logPath ?? DEFAULT_REQUEST_AUDIT_LOG_PATH,
    archiveMode: options.archiveMode ?? "daily",
    purgeMaxAgeMs: options.purgeMaxAgeMs,
    logger: options.logger,
    resolveRemoteIp: options.resolveRemoteIp,
    nowMs: options.nowMs,
    dateIso: options.dateIso,
  });

  return {
    bootstrapSingleton: service.bootstrapSingleton,
    requestAudit: service.requestAudit,
    purgeOldLogs: service.purgeOldLogs,
    purgeOldArchives: service.purgeOldArchives,
    readLog: service.readLog,
    waitForIdle: service.waitForIdle,
  };
}
