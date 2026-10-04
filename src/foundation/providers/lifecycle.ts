import type { ProviderJob } from "./contract";

export type ProviderJobStatus = ProviderJob["status"];
const terminal = new Set<ProviderJobStatus>(["succeeded", "failed", "cancelled"]);

export function isTerminalProviderJob(job: ProviderJob): boolean {
  return terminal.has(job.status);
}

export function canTransitionProviderJob(from: ProviderJobStatus, to: ProviderJobStatus): boolean {
  if (from === to) return true;
  if (terminal.has(from)) return false;
  if (from === "queued") return to === "running" || to === "succeeded" || to === "failed" || to === "cancelled";
  if (from === "running") return to === "succeeded" || to === "failed" || to === "cancelled";
  return false;
}
