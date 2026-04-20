import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

interface AppendQueueOptions {
  ensureDir?: boolean;
  mode?: number;
}

export class FileAppendQueue {
  private static readonly queues = new Map<string, Promise<void>>();

  private static enqueue(filePath: string, task: () => Promise<void>) {
    const previousTask = this.queues.get(filePath) ?? Promise.resolve();

    const nextTask = previousTask
      .catch(() => {
        // ignore previous queue errors and keep queue alive
      })
      .then(task)
      .finally(() => {
        if (this.queues.get(filePath) === nextTask) {
          this.queues.delete(filePath);
        }
      });

    this.queues.set(filePath, nextTask);
    return nextTask;
  }

  static append(filePath: string, data: string, options: AppendQueueOptions = {}) {
    const ensureDir = options.ensureDir ?? true;

    return this.enqueue(filePath, async () => {
      if (ensureDir) {
        await mkdir(dirname(filePath), { recursive: true });
      }

      await appendFile(filePath, data, {
        encoding: "utf8",
        mode: options.mode,
      });
    });
  }

  static waitForIdle(filePath?: string) {
    if (typeof filePath === "string") {
      return this.queues.get(filePath) ?? Promise.resolve();
    }

    const tasks = [...this.queues.values()];
    return Promise.all(tasks).then(() => undefined);
  }
}
