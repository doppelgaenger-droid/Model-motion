// ArtCraft Omni API provider contract. No outbound requests are made by this module.
export const ARTCRAFT = Object.freeze({
  id: "artcraft",
  apiBaseUrl: "https://api.storyteller.ai",
  generation: Object.freeze({
    video: "/v1/omni_api/generate/video",
    image: "/v1/omni_api/generate/image"
  }),
  jobStatusPath: "/v1/omni_api/job_status/job/",
  jobStatusBatch: "/v1/omni_api/job_status/batch",
  enabled: false,
  dispatchEnabled: false,
  referenceUploadsEnabled: false,
  accountTier: "free-unverified-api-entitlement",
  credentialStatus: "stored-not-validated",
  prices: "unverified"
});

const STATES = Object.freeze({
  pending: "queued",
  started: "processing",
  attempt_failed: "processing",
  complete_success: "completed",
  complete_failure: "failed",
  dead: "failed",
  cancelled_by_user: "cancelled",
  cancelled_by_system: "cancelled"
});
export function normalizeArtCraftJobStatus(payload) {
  const status = payload?.state?.status?.status;
  if (!Object.hasOwn(STATES, status)) return "unknown";
  return STATES[status];
}
export function redactArtCraftJobState(payload) {
  const state = payload?.state;
  return {
    status: normalizeArtCraftJobStatus(payload),
    progress: Number.isInteger(state?.status?.progress_percentage)
      ? Math.max(0, Math.min(100, state.status.progress_percentage)) : null,
    jobToken: typeof state?.job_token === "string" ? state.job_token : null
  };
}
export function assertArtCraftDispatchBlocked() {
  throw new Error("ARTCRAFT_DISPATCH_DISABLED");
}
