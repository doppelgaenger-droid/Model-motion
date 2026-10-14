export const JOB_STATUSES = Object.freeze([
  "draft", "awaiting_quote", "awaiting_approval", "ready", "queued",
  "processing", "completed", "failed", "cancelled"
]);
const allowed = Object.freeze({
  draft: ["awaiting_quote", "cancelled"],
  awaiting_quote: ["awaiting_approval", "failed", "cancelled"],
  awaiting_approval: ["ready", "cancelled"],
  ready: ["queued", "cancelled"],
  queued: ["processing", "failed", "cancelled"],
  processing: ["completed", "failed", "cancelled"],
  completed: [], failed: [], cancelled: []
});
export function canTransition(from, to) {
  return Object.hasOwn(allowed,from) && allowed[from].includes(to);
}
export function normalizeBudgetUsd(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1000) {
    throw new Error("INVALID_JOB_BUDGET");
  }
  return Math.round(value * 100) / 100;
}
export function usdToCents(value) {
  return Math.round(normalizeBudgetUsd(value) * 100);
}
export function reserveQuote({ budgetUsd=0.5, quotedUsd, approvalCents=null }) {
  const budgetCents=usdToCents(budgetUsd);
  const quoteCents=usdToCents(quotedUsd);
  const explicitlyApproved=Number.isSafeInteger(approvalCents) && approvalCents >= quoteCents;
  if (quoteCents > budgetCents && !explicitlyApproved) {
    return Object.freeze({ permitted:false, reason:"APPROVAL_REQUIRED", budgetCents, quoteCents });
  }
  return Object.freeze({ permitted:true, reason:"WITHIN_APPROVED_BUDGET", budgetCents, quoteCents });
}
export function makeDraft({ uid, provider, characterId, requestedBudgetUsd=0.5, idempotencyKey }) {
  if (typeof uid!=="string" || !uid || !["artcraft","sogni"].includes(provider)
    || typeof characterId!=="string" || !characterId
    || typeof idempotencyKey!=="string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) {
    throw new Error("INVALID_DRAFT");
  }
  return Object.freeze({
    schemaVersion:1, ownerUid:uid, provider, characterId,
    idempotencyKey, budgetCents:usdToCents(requestedBudgetUsd),
    status:"draft", quotedCents:null, approvedCents:null,
    reservationCents:0, externalJobToken:null
  });
}
