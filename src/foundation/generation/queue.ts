/** Provider-independent, deterministic job transition model. Persist transitions transactionally server-side. */
export type QueueStatus = "draft" | "validating" | "blocked_budget" | "blocked_privacy" |
  "blocked_capability" | "blocked_price_unknown" | "queued" | "submitting" |
  "processing" | "completed" | "failed" | "cancel_requested" | "cancelled" | "expired";
export type QueueEvent = "validate" | "budget_block" | "privacy_block" | "capability_block" |
  "price_block" | "authorize" | "dispatch" | "provider_accepted" | "provider_completed" |
  "provider_failed" | "request_cancel" | "cancel_confirmed" | "expire" | "retry";
export interface GenerationJob {
  id: string;
  ownerUid: string;
  shotId: string;
  takeId: string;
  inputSnapshotId: string;
  idempotencyKey: string;
  providerId: string | null;
  providerJobId: string | null;
  status: QueueStatus;
  maxCostUsd: number;
  estimatedCostUsd: number | null;
  actualCostUsd: number | null;
  attempt: number;
  revision: number;
}
const transitions: Partial<Record<QueueStatus,Partial<Record<QueueEvent, QueueStatus>>>> = {
  draft: { validate: "validating" },
  validating: { budget_block: "blocked_budget", privacy_block: "blocked_privacy", capability_block:"blocked_capability", price_block:"blocked_price_unknown", authorize:"queued" },
  blocked_budget: { validate: "validating" },
  blocked_privacy: { validate: "validating" },
  blocked_capability: { validate: "validating" },
  blocked_price_unknown: { validate: "validating" },
  queued: { dispatch: "submitting", request_cancel: "cancel_requested", expire:"expired" },
  submitting: { provider_accepted: "processing", provider_completed:"completed", provider_failed:"failed", request_cancel:"cancel_requested" },
  processing: { provider_completed:"completed", provider_failed:"failed", request_cancel:"cancel_requested" },
  cancel_requested: { cancel_confirmed:"cancelled", provider_completed:"completed", provider_failed:"failed" },
  failed: { retry:"validating" },
};
export function transitionJob(job: Readonly<GenerationJob>, event: QueueEvent): GenerationJob {
  const status = transitions[job.status]?.[event];
  if (!status) throw new Error(`Invalid job transition: ${job.status} / ${event}`);
  return { ...job, status, revision: job.revision + 1, attempt: event === "retry" ? job.attempt + 1 : job.attempt };
}
/** This is a pure state machine; persistence, leases, provider reconciliation and billing belong to backend services. */
