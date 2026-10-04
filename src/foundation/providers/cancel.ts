import type { ProviderJob, VideoProvider } from "./contract";
import { ProviderError } from "./errors";
import { isTerminalProviderJob } from "./lifecycle";

export async function cancelProviderJob(provider: VideoProvider, job: ProviderJob): Promise<ProviderJob> {
  if (isTerminalProviderJob(job)) return job;
  if (!provider.cancel) throw new ProviderError("INVALID_REQUEST", `Provider ${provider.id} does not support cancellation.`);
  return provider.cancel(job.id);
}
