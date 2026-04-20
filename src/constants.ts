import { resolve } from "node:path";

export const DEFAULT_PURGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_REQUEST_AUDIT_LOG_PATH = resolve("data/logs/request-audit.log");
export const DEFAULT_SECURITY_AUDIT_LOG_PATH = resolve("data/logs/security-audit.log");
export const DEFAULT_DEBUG_AUDIT_LOG_PATH = resolve("data/logs/debug-audit.log");
