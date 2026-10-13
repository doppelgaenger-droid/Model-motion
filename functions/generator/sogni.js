/**
 * Sogni REST adapter for the existing Generation Router.
 * Server-side only. This module deliberately does not accept a client-supplied USD estimate.
 * API: https://docs.sogni.ai/api-reference/workflows/
 */
const BASE = "https://api.sogni.ai";
const VALID_MODELS = new Set(["ltx25", "ltx23", "wan22", "minimax-h3-t2v", "minimax-h3-t2v-turbo"]);
export const DEFAULT_JOB_BUDGET_USD = 0.50;

function assertKey(apiKey) {
  if (typeof apiKey !== "string" || !apiKey.trim()) throw new Error("SOGNI_API_KEY is required on the trusted backend");
}
function assertJob({ prompt, model = "ltx25", duration = 5, idempotencyKey }) {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 3000) throw new Error("Invalid prompt");
  if (!VALID_MODELS.has(model)) throw new Error("Model requires explicit capability and policy approval");
  if (!Number.isInteger(duration) || duration < 2 || duration > 20) throw new Error("Invalid video duration");
  if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey)) throw new Error("Stable idempotency key required");
  return { prompt: prompt.trim(), model, duration, idempotencyKey };
}
export function buildSogniWorkflow(input) {
  const { prompt, model, duration } = assertJob(input);
  return {
    input: { title: "Model Motion video take", steps: [{ id: "clip", toolName: "generate_video", arguments: { prompt, videoModel: model, duration } }] },
    billing_mode: "tokens",
    token_type: "spark",
    safe_content_filter: true,
  };
}
async function apiRequest(apiKey, path, { method = "GET", body, idempotencyKey, fetchImpl = fetch } = {}) {
  assertKey(apiKey);
  const response = await fetchImpl(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const payload = await response.json();
  return { ok: response.ok, status: response.status, payload };
}
/** Estimate without submitting a paid job. Sogni documents a 400 cost-confirmation response. */
export async function previewSogniCost({ apiKey, request, fetchImpl }) {
  const valid = assertJob(request);
  const result = await apiRequest(apiKey, "/v1/creative-agent/workflows", {
    method: "POST", idempotencyKey: valid.idempotencyKey + "-estimate",
    body: { ...buildSogniWorkflow(valid), confirm_cost: false }, fetchImpl,
  });
  const details = result.payload?.details ?? result.payload?.error?.details;
  if (result.status === 400 && details?.confirmationRequired === true && details?.estimatedCapacity != null) {
    return { provider: "sogni", unit: "capacity_units", capacityEstimate: details.estimatedCapacity, usdEstimate: null, submissionAuthorized: false };
  }
  // Never treat unknown estimates, 402 vendor gating or unexpected 2xx as authorization to spend.
  throw new Error(`Sogni quote unavailable (HTTP ${result.status}); no job submitted`);
}
/** Trusted backend must independently derive verified USD price before this function can submit. */
export async function submitApprovedSogni({ apiKey, request, authorization, fetchImpl }) {
  const valid = assertJob(request);
  if (!authorization || authorization.source !== "trusted-server-quote" ||
      authorization.quoteId !== valid.idempotencyKey ||
      !Number.isFinite(authorization.estimatedUSD) || authorization.estimatedUSD < 0 ||
      !Number.isFinite(authorization.maxBudgetUSD) || authorization.maxBudgetUSD < 0 ||
      authorization.estimatedUSD > authorization.maxBudgetUSD ||
      authorization.approved !== true) {
    throw new Error("Awaiting trusted USD quote and explicit budget approval; no provider submission");
  }
  const result = await apiRequest(apiKey, "/v1/creative-agent/workflows", {
    method: "POST", idempotencyKey: valid.idempotencyKey,
    body: { ...buildSogniWorkflow(valid), confirm_cost: true }, fetchImpl,
  });
  if (!result.ok || !result.payload?.data?.workflow?.workflowId) throw new Error(`Sogni submission failed (HTTP ${result.status})`);
  return { provider: "sogni", jobId: result.payload.data.workflow.workflowId, status: "queued" };
}
export async function readSogniJob({ apiKey, jobId, fetchImpl }) {
  if (typeof jobId !== "string" || !/^wf_[A-Za-z0-9_-]{1,180}$/.test(jobId)) throw new Error("Invalid Sogni workflow ID");
  const result = await apiRequest(apiKey, `/v1/creative-agent/workflows/${encodeURIComponent(jobId)}`, { fetchImpl });
  if (!result.ok) throw new Error(`Sogni status failed (HTTP ${result.status})`);
  const wf = result.payload?.data?.workflow;
  if (!wf) throw new Error("Missing Sogni workflow");
  const mapping = { queued: "queued", running: "running", completed: "succeeded", failed: "failed", partial_failure: "failed", cancelled: "cancelled", waiting_for_user: "queued" };
  const status = mapping[wf.status] ?? "queued";
  const urls = (wf.steps ?? []).flatMap(step => (step.artifacts ?? []).map(artifact => artifact.url)).filter(url => typeof url === "string" && url.startsWith("https://"));
  return { id: jobId, status, outputs: urls, requiresProviderApproval: wf.status === "waiting_for_user" };
}
