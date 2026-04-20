import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { AuditLoggerService } from "../src/service";

const temporaryDirs: string[] = [];

afterEach(async () => {
  for (const directory of temporaryDirs.splice(0, temporaryDirs.length)) {
    await rm(directory, { recursive: true, force: true });
  }
});

async function createTempDir() {
  const directory = await mkdtemp(join(tmpdir(), "audit-logger-"));
  temporaryDirs.push(directory);
  return directory;
}

function createFinishableResponse(statusCode = 200) {
  const listeners = new Map<"finish", () => void>();

  return {
    statusCode,
    on(event: "finish", listener: () => void) {
      listeners.set(event, listener);
    },
    finish() {
      const listener = listeners.get("finish");
      if (listener) {
        listener();
      }
    },
  };
}

describe("AuditLoggerService (instance mode)", () => {
  it("bootstraps one log file per instance", async () => {
    const directory = await createTempDir();

    const requestLogger = new AuditLoggerService({
      mode: "request",
      logPath: join(directory, "request-audit.log"),
      archiveMode: "daily",
    });

    const securityLogger = new AuditLoggerService({
      mode: "security",
      logPath: join(directory, "security-audit.log"),
      archiveMode: "daily",
    });

    const debugLogger = new AuditLoggerService({
      mode: "debug",
      logPath: join(directory, "debug-audit.log"),
      archiveMode: "none",
      enabled: true,
    });

    requestLogger.bootstrapSingleton();
    securityLogger.bootstrapSingleton();
    debugLogger.bootstrapSingleton();

    expect(existsSync(join(directory, "request-audit.log"))).toBe(true);
    expect(existsSync(join(directory, "security-audit.log"))).toBe(true);
    expect(existsSync(join(directory, "debug-audit.log"))).toBe(true);
  });

  it("writes request audit entries through middleware", async () => {
    const directory = await createTempDir();
    const requestLogPath = join(directory, "request-audit.log");

    const requestLogger = new AuditLoggerService({
      mode: "request",
      logPath: requestLogPath,
      archiveMode: "daily",
    });

    const request = {
      method: "POST",
      originalUrl: "/api/internal/hmac/authority/sync",
      secure: true,
      headers: {
        "x-forwarded-for": "170.1.2.3",
      },
      socket: {
        remoteAddress: "127.0.0.1",
      },
    };

    const response = createFinishableResponse(201);

    let nextCalled = false;
    requestLogger.requestAudit(request, response, () => {
      nextCalled = true;
    });

    response.finish();
    await requestLogger.waitForIdle();

    const content = readFileSync(requestLogPath, "utf8");

    expect(nextCalled).toBe(true);
    expect(content).toContain("method=POST");
    expect(content).toContain("url=/api/internal/hmac/authority/sync");
    expect(content).toContain("status=201");
    expect(content).toContain("170.1.2.3");
  });

  it("does not write debug lines when disabled", async () => {
    const directory = await createTempDir();
    const debugLogPath = join(directory, "debug-audit.log");

    const debugLogger = new AuditLoggerService({
      mode: "debug",
      logPath: debugLogPath,
      enabled: false,
      archiveMode: "none",
    });

    debugLogger.debugAudit("this should not be logged");
    await debugLogger.waitForIdle();

    expect(existsSync(debugLogPath)).toBe(false);
  });

  it("purges request log and archives removed lines", async () => {
    const directory = await createTempDir();
    const requestLogPath = join(directory, "request-audit.log");

    const fixedNow = Date.parse("2026-04-20T12:00:00.000Z");
    const iso = (ms: number) => new Date(ms).toISOString();

    const oldLine = `${iso(fixedNow - 10 * 24 * 60 * 60 * 1000)} 170.1.1.1 proto=http method=GET url=/old status=200 duration=1ms`;
    const recentLine = `${iso(fixedNow - 60 * 60 * 1000)} 170.1.1.2 proto=http method=GET url=/recent status=200 duration=1ms`;

    await writeFile(requestLogPath, `${oldLine}\n${recentLine}\n`);

    const requestLogger = new AuditLoggerService({
      mode: "request",
      logPath: requestLogPath,
      archiveMode: "daily",
      purgeMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
      nowMs: () => fixedNow,
      dateIso: (timestampMs = fixedNow) => new Date(timestampMs).toISOString(),
    });

    requestLogger.purgeOldLogs();

    const logContent = readFileSync(requestLogPath, "utf8");
    expect(logContent).toContain("/recent");
    expect(logContent).not.toContain("/old");

    const archivePath = join(directory, "archives", `request-audit.log.${iso(fixedNow).slice(0, 10)}.log`);
    expect(existsSync(archivePath)).toBe(true);

    const archiveContent = readFileSync(archivePath, "utf8");
    expect(archiveContent).toContain("/old");
  });

  it("purges old request archive files", async () => {
    const directory = await createTempDir();
    const requestLogPath = join(directory, "request-audit.log");
    const archiveDir = join(directory, "archives");

    await writeFile(requestLogPath, "");
    await mkdir(archiveDir, { recursive: true });

    const keepFile = join(archiveDir, "request-audit.log.2026-04-19.log");
    const removeFile = join(archiveDir, "request-audit.log.2026-04-10.log");

    writeFileSync(keepFile, "keep");
    writeFileSync(removeFile, "remove");

    const fixedNow = Date.parse("2026-04-20T12:00:00.000Z");

    const requestLogger = new AuditLoggerService({
      mode: "request",
      logPath: requestLogPath,
      archiveMode: "daily",
      nowMs: () => fixedNow,
      dateIso: (timestampMs = fixedNow) => new Date(timestampMs).toISOString(),
    });

    requestLogger.purgeOldArchives({ maxAgeMs: 3 * 24 * 60 * 60 * 1000 });

    expect(existsSync(keepFile)).toBe(true);
    expect(existsSync(removeFile)).toBe(false);
  });
});
