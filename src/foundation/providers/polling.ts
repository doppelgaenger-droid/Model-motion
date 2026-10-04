import type { ProviderJob, VideoProvider } from "./contract";
import { isTerminalProviderJob } from "./lifecycle";

export interface PollingPolicy {
  maxAttempts: number;
  intervalMs: number;
}

export async function pollProviderJob(
  provider: VideoProvider,
  initialJob: ProviderJob,
  policy: PollingPolicy,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<ProviderJob> {
  let job = initialJob;
  for (let attempt = 0; attempt < policy.maxAttempts && !isTerminalProviderJob(job); attempt += 1) {
    if (policy.intervalMs > 0) await wait(policy.intervalMs);
    job = await provider.getJob(job.id);
  }
  return job;
}
