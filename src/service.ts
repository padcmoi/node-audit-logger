import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { DEFAULT_PURGE_MAX_AGE_MS } from "./constants";
import { FileAppendQueue } from "./file-queue";
import { resolveRemoteIpFromRequest } from "./ip";
import { dateISO, dateNowMs } from "./time";
import type { AuditArchiveMode, AuditLogInstanceOptions, AuditLogger, AuditMode, HttpRequestLike, HttpResponseLike, NextLike, PurgeArchivesOptions } from "./types";

export class AuditLoggerService {
  private readonly logPath: string;
  private readonly mode: AuditMode;
  private readonly enabled: boolean;
  private readonly archiveMode: AuditArchiveMode;
  private readonly purgeMaxAgeMs: number;
  private readonly logger: AuditLogger | undefined;
  private readonly resolveRemoteIp: (request: HttpRequestLike) => string;
  private readonly nowMs: () => number;
  private readonly dateIso: (timestampMs?: number) => string;

  private bootstrapped = false;

  constructor(options: AuditLogInstanceOptions) {
    this.logPath = options.logPath;
    this.mode = options.mode;
    this.enabled = options.enabled ?? true;
    this.archiveMode = this.resolveArchiveMode(options.mode, options.archiveMode);
    this.purgeMaxAgeMs = this.resolvePositiveDuration(options.purgeMaxAgeMs, DEFAULT_PURGE_MAX_AGE_MS);
    this.logger = options.logger;
    this.resolveRemoteIp = options.resolveRemoteIp ?? resolveRemoteIpFromRequest;
    this.nowMs = options.nowMs ?? dateNowMs;
    this.dateIso = options.dateIso ?? dateISO;
  }

  private resolveArchiveMode(mode: AuditMode, archiveMode: AuditArchiveMode | undefined) {
    if (archiveMode === "daily" || archiveMode === "none") {
      return archiveMode;
    }

    return mode === "debug" ? "none" : "daily";
  }

  private resolvePositiveDuration(value: number | undefined, fallback: number) {
    if (typeof value !== "number") return fallback;
    if (!Number.isFinite(value) || value <= 0) return fallback;
    return value;
  }

  private logInfo(message: string, meta?: unknown) {
    this.logger?.info?.(message, meta);
  }

  private logWarn(message: string, meta?: unknown) {
    this.logger?.warn?.(message, meta);
  }

  private logError(message: string, meta?: unknown) {
    this.logger?.error?.(message, meta);
  }

  private ensureLogFile() {
    try {
      const logDir = dirname(this.logPath);

      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }

      if (!existsSync(this.logPath)) {
        writeFileSync(this.logPath, "");
      }

      try {
        chmodSync(this.logPath, 0o777);
      } catch {
        // ignore chmod permission errors
      }
    } catch (error) {
      this.logError(`[audit:${this.mode}] failed to initialize log file`, { error, filePath: this.logPath });
    }
  }

  bootstrapSingleton = () => {
    if (this.bootstrapped) return;
    if (!this.enabled) {
      this.bootstrapped = true;
      return;
    }

    this.ensureLogFile();
    this.bootstrapped = true;
  };

  private appendLine(line: string, scope: string) {
    FileAppendQueue.append(this.logPath, line, { mode: 0o600 }).catch((error: unknown) => {
      this.logError(`[${scope}] internal error`, { error, filePath: this.logPath });
    });
  }

  private guardMode(expected: AuditMode, methodName: string) {
    if (this.mode === expected) return true;

    this.logWarn(`[audit:${this.mode}] invalid method call`, {
      methodName,
      expectedMode: expected,
      currentMode: this.mode,
    });

    return false;
  }

  readonly requestAudit = (request: HttpRequestLike, response: HttpResponseLike, next?: NextLike) => {
    const canRun = this.enabled && this.guardMode("request", "requestAudit");

    if (canRun) {
      if (!this.bootstrapped) {
        this.bootstrapSingleton();
      }

      const startedAt = this.nowMs();

      response.on("finish", () => {
        const ts = this.dateIso(this.nowMs());
        const ip = this.resolveRemoteIp(request);
        const protocol = request.secure ? "https" : "http";
        const method = request.method ?? "GET";
        const url = request.originalUrl ?? request.url ?? "/";
        const status = response.statusCode ?? 200;
        const durationMs = this.nowMs() - startedAt;

        const line = `${ts} ${ip} ` + `proto=${protocol} ` + `method=${method} url=${url} ` + `status=${status} duration=${durationMs}ms\n`;

        this.appendLine(line, "requestAudit");
      });
    }

    if (typeof next === "function") {
      next();
    }
  };

  readonly securityAudit = (request: HttpRequestLike, reason: string) => {
    if (!this.enabled) return;
    if (!this.guardMode("security", "securityAudit")) return;

    if (!this.bootstrapped) {
      this.bootstrapSingleton();
    }

    const ts = this.dateIso(this.nowMs());
    const ip = this.resolveRemoteIp(request);
    const protocol = request.secure ? "https" : "http";
    const method = request.method ?? "GET";
    const url = request.originalUrl ?? request.url ?? "/";

    const line = `${ts} ${ip} proto=${protocol} method=${method} url=${url} ${reason}\n`;

    this.appendLine(line, "securityAudit");
  };

  readonly debugAudit = (message: string) => {
    if (!this.enabled) return;
    if (!this.guardMode("debug", "debugAudit")) return;

    if (!this.bootstrapped) {
      this.bootstrapSingleton();
    }

    const ts = this.dateIso(this.nowMs());
    const line = `${ts} ${message}\n`;

    this.appendLine(line, "debugAudit");
  };

  waitForIdle = async () => {
    await FileAppendQueue.waitForIdle();
  };

  readLog = () => {
    if (!existsSync(this.logPath)) return null;
    return readFileSync(this.logPath, "utf8");
  };

  private splitByCutoff(lines: string[], cutoffMs: number) {
    const kept: string[] = [];
    const removed: string[] = [];

    for (const line of lines) {
      const timestamp = line.split(" ")[0] ?? "";
      const parsed = Date.parse(timestamp);

      if (Number.isNaN(parsed) || parsed >= cutoffMs) {
        kept.push(line);
      } else {
        removed.push(line);
      }
    }

    return { kept, removed };
  }

  private computeCutoff(maxAgeMs: number) {
    const now = this.nowMs();
    const nowDate = new Date(now);
    const startOfTodayUtcMs = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate());

    return {
      now,
      cutoffMs: Math.max(now - maxAgeMs, startOfTodayUtcMs),
    };
  }

  private rewriteLogFile(kept: string[]) {
    const tmpPath = `${this.logPath}.tmp`;
    const output = kept.length > 0 ? `${kept.join("\n")}\n` : "";

    writeFileSync(tmpPath, output);
    renameSync(tmpPath, this.logPath);
  }

  private archiveRemovedLines(removed: string[]) {
    if (removed.length === 0) return null;

    const today = this.dateIso(this.nowMs()).slice(0, 10);
    const archiveDir = join(dirname(this.logPath), "archives");
    const archivePath = join(archiveDir, `${basename(this.logPath)}.${today}.log`);

    if (!existsSync(archiveDir)) {
      mkdirSync(archiveDir, { recursive: true });
    }

    const removedOutput = `${removed.join("\n")}\n`;

    if (existsSync(archivePath)) {
      appendFileSync(archivePath, removedOutput);
    } else {
      writeFileSync(archivePath, removedOutput);
    }

    return archivePath;
  }

  private purgeWithArchive(maxAgeMs: number) {
    try {
      if (!existsSync(this.logPath)) return;

      const raw = readFileSync(this.logPath, "utf8");
      if (!raw.trim()) return;

      const lines = raw.split("\n").filter(Boolean);
      const cutoff = this.computeCutoff(maxAgeMs);
      const result = this.splitByCutoff(lines, cutoff.cutoffMs);

      this.rewriteLogFile(result.kept);

      const archivePath = this.archiveRemovedLines(result.removed);
      if (archivePath) {
        this.logInfo(`[audit:${this.mode}] Purged old logs, archived removed entries to ${archivePath} (${this.dateIso(this.nowMs())})`);
        return;
      }

      this.logInfo(`[audit:${this.mode}] Purged old logs (${this.dateIso(this.nowMs())})`);
    } catch (error) {
      this.logError(`[audit:${this.mode}] purgeOldLogs error`, { error, filePath: this.logPath });
    }
  }

  private purgeSimple(maxAgeMs: number) {
    try {
      if (!existsSync(this.logPath)) return;

      const raw = readFileSync(this.logPath, "utf8");
      const lines = raw.split("\n").filter(Boolean);
      const now = this.nowMs();

      const kept = lines.filter((line) => {
        const timestamp = line.split(" ")[0] ?? "";
        const parsed = Date.parse(timestamp);
        if (Number.isNaN(parsed)) return true;

        return now - parsed <= maxAgeMs;
      });

      this.rewriteLogFile(kept);
      this.logInfo(`[audit:${this.mode}] Purged old logs, kept ${kept.length} entries (${this.dateIso(this.nowMs())})`);
    } catch (error) {
      this.logError(`[audit:${this.mode}] purgeOldLogs error`, { error, filePath: this.logPath });
    }
  }

  purgeOldLogs = () => {
    if (this.archiveMode === "daily") {
      this.purgeWithArchive(this.purgeMaxAgeMs);
      return;
    }

    this.purgeSimple(this.purgeMaxAgeMs);
  };

  purgeOldArchives = (options: PurgeArchivesOptions) => {
    if (this.archiveMode !== "daily") return;

    try {
      const archiveDir = join(dirname(this.logPath), "archives");
      if (!existsSync(archiveDir)) return;

      const maxAgeMs = this.resolvePositiveDuration(options.maxAgeMs, this.purgeMaxAgeMs);
      const files = readdirSync(archiveDir);

      for (const fileName of files) {
        const matched = /^.+\.(\d{4}-\d{2}-\d{2})\.log$/u.exec(fileName);
        if (!matched) continue;

        const day = matched[1] ?? "";
        const timestampMs = Date.parse(`${day}T00:00:00.000Z`);
        if (Number.isNaN(timestampMs)) continue;

        if (this.nowMs() - timestampMs > maxAgeMs) {
          unlinkSync(join(archiveDir, fileName));
        }
      }
    } catch (error) {
      this.logError(`[audit:${this.mode}] purgeOldArchives error`, { error, filePath: this.logPath });
    }
  };
}
