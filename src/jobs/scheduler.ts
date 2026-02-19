/**
 * Simple in-process interval-based job scheduler.
 * Can be replaced with pg-boss or BullMQ when persistence/distribution is needed.
 */

export type JobFn = () => Promise<void>;

interface RegisteredJob {
  fn: JobFn;
  intervalMs: number;
}

export class JobScheduler {
  private jobs = new Map<string, RegisteredJob>();
  private intervals = new Map<string, ReturnType<typeof setInterval>>();

  register(name: string, fn: JobFn, intervalMs: number): void {
    this.jobs.set(name, { fn, intervalMs });
  }

  start(): void {
    for (const [name, { fn, intervalMs }] of this.jobs) {
      const wrapped = async () => {
        try {
          await fn();
        } catch (err) {
          console.error(`[JobScheduler] "${name}" failed:`, err);
        }
      };
      const id = setInterval(() => void wrapped(), intervalMs);
      this.intervals.set(name, id);
      console.log(`[JobScheduler] started "${name}" every ${intervalMs}ms`);
    }
  }

  stop(): void {
    for (const [name, id] of this.intervals) {
      clearInterval(id);
      console.log(`[JobScheduler] stopped "${name}"`);
    }
    this.intervals.clear();
  }
}
