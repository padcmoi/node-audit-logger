export interface AuditLogger {
  info?: (message: string, meta?: unknown) => void;
  warn?: (message: string, meta?: unknown) => void;
  error?: (message: string, meta?: unknown) => void;
}

export type HeaderValue = string | readonly string[] | undefined;

export interface HttpHeadersLike {
  [key: string]: HeaderValue;
}

export interface HttpRequestLike {
  method?: string;
  url?: string;
  originalUrl?: string;
  secure?: boolean;
  headers?: HttpHeadersLike;
  socket?: { remoteAddress?: string | null } | null;
}

export interface HttpResponseLike {
  statusCode?: number;
  on: (event: "finish", listener: () => void) => unknown;
}

export type NextLike = () => void;

export type AuditMode = "request" | "security" | "debug";

export type AuditArchiveMode = "none" | "daily";

export interface PurgeArchivesOptions {
  maxAgeMs: number;
}

export interface AuditLogInstanceOptions {
  logPath: string;
  mode: AuditMode;
  enabled?: boolean;
  archiveMode?: AuditArchiveMode;
  purgeMaxAgeMs?: number;
  logger?: AuditLogger;
  resolveRemoteIp?: (request: HttpRequestLike) => string;
  nowMs?: () => number;
  dateIso?: (timestampMs?: number) => string;
}

export interface AuditFactoryBaseOptions {
  logPath?: string;
  archiveMode?: AuditArchiveMode;
  purgeMaxAgeMs?: number;
  logger?: AuditLogger;
  resolveRemoteIp?: (request: HttpRequestLike) => string;
  nowMs?: () => number;
  dateIso?: (timestampMs?: number) => string;
}

export type RequestAuditFactoryOptions = AuditFactoryBaseOptions;

export type SecurityAuditFactoryOptions = AuditFactoryBaseOptions;

export type DebugAuditFactoryOptions = Omit<AuditFactoryBaseOptions, "resolveRemoteIp"> & {
  enabled?: boolean;
};
