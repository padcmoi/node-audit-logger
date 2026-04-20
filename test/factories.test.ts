import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createDebugAudit, createSecurityAudit } from "../src";

const temporaryDirs: string[] = [];

afterEach(async () => {
  for (const directory of temporaryDirs.splice(0, temporaryDirs.length)) {
    await rm(directory, { recursive: true, force: true });
  }
});

async function createTempDir() {
  const directory = await mkdtemp(join(tmpdir(), "audit-factory-"));
  temporaryDirs.push(directory);
  return directory;
}

describe("audit factories", () => {
  it("writes debug lines with createDebugAudit", async () => {
    const directory = await createTempDir();
    const debugLogPath = join(directory, "debug-audit.log");

    const debugAudit = createDebugAudit({
      logPath: debugLogPath,
      enabled: true,
      archiveMode: "none",
    });

    debugAudit.bootstrapSingleton();
    debugAudit.debugAudit("factory-debug");
    await debugAudit.waitForIdle();

    expect(existsSync(debugLogPath)).toBe(true);
    expect(readFileSync(debugLogPath, "utf8")).toContain("factory-debug");
  });

  it("writes security lines with createSecurityAudit", async () => {
    const directory = await createTempDir();
    const securityLogPath = join(directory, "security-audit.log");

    const securityAudit = createSecurityAudit({
      logPath: securityLogPath,
      archiveMode: "daily",
    });

    securityAudit.bootstrapSingleton();
    securityAudit.securityAudit(
      {
        method: "PUT",
        originalUrl: "/security/test",
        secure: false,
        headers: {
          "x-real-ip": "10.1.2.3",
        },
      },
      "reason=token_invalid",
    );

    await securityAudit.waitForIdle();

    expect(existsSync(securityLogPath)).toBe(true);

    const content = readFileSync(securityLogPath, "utf8");
    expect(content).toContain("reason=token_invalid");
    expect(content).toContain("method=PUT");
    expect(content).toContain("10.1.2.3");
  });
});
