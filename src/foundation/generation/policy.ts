/** Generation policies are server-enforced; browser values are advisory only. */
export const DEFAULT_JOB_BUDGET_USD = 0.50;
export type PrivacyClass = "standard" | "sensitive" | "local_only";
export type ProcessingMode = "economy";
export interface GenerationPolicy {
  mode: ProcessingMode;
  maxCostUsd: number;
  sensitiveFilterEnabled: true;
  allowPaidRetry: false;
}
export interface ProviderOffer {
  id: string;
  capabilityCompatible: boolean;
  privacyApprovedFor: readonly PrivacyClass[];
  /** A verified upper bound, not a best-case price estimate. */
  maximumChargeUsd: number | null;
}
export type RoutingDecision =
  | { kind: "approved"; providerId: string; authorizedMaxUsd: number }
  | { kind: "blocked_budget"; cheapestRequiredUsd: number | null }
  | { kind: "blocked_privacy" | "blocked_capability" | "blocked_price_unknown" };
export function validateJobBudget(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
    throw new Error("Budget must be a finite non-negative USD amount in cents.");
  }
  return amount;
}
export function economyPolicy(maxCostUsd = DEFAULT_JOB_BUDGET_USD): GenerationPolicy {
  return { mode: "economy", maxCostUsd: validateJobBudget(maxCostUsd), sensitiveFilterEnabled: true, allowPaidRetry: false };
}
export function resolvePrivacyClass(classes: readonly PrivacyClass[]): PrivacyClass {
  if (classes.includes("local_only")) return "local_only";
  if (classes.includes("sensitive")) return "sensitive";
  return "standard";
}
export function routeEconomy(policy: GenerationPolicy, privacy: PrivacyClass, offers: readonly ProviderOffer[]): RoutingDecision {
  validateJobBudget(policy.maxCostUsd);
  const compatible = offers.filter(p => p.capabilityCompatible);
  if (!compatible.length) return { kind: "blocked_capability" };
  const privateEnough = compatible.filter(p => p.privacyApprovedFor.includes(privacy));
  if (!privateEnough.length) return { kind: "blocked_privacy" };
  const known = privateEnough.filter((p): p is ProviderOffer & {maximumChargeUsd:number} => p.maximumChargeUsd !== null && Number.isFinite(p.maximumChargeUsd) && p.maximumChargeUsd >= 0);
  if (!known.length) return { kind: "blocked_price_unknown" };
  const sorted = [...known].sort((a,b) => a.maximumChargeUsd - b.maximumChargeUsd || a.id.localeCompare(b.id));
  const cheapest = sorted[0];
  if (cheapest.maximumChargeUsd > policy.maxCostUsd) return { kind: "blocked_budget", cheapestRequiredUsd: cheapest.maximumChargeUsd };
  return { kind: "approved", providerId: cheapest.id, authorizedMaxUsd: policy.maxCostUsd };
}
