import type { CostRecord } from "../core/contracts";

export function validateCostRecord(cost: CostRecord): CostRecord {
  if (!Number.isFinite(cost.estimated) || cost.estimated < 0) throw new Error("Estimated cost must be a finite non-negative number.");
  if (cost.actual != null && (!Number.isFinite(cost.actual) || cost.actual < 0)) throw new Error("Actual cost must be a finite non-negative number.");
  if (cost.billableSeconds != null && (!Number.isFinite(cost.billableSeconds) || cost.billableSeconds < 0)) throw new Error("Billable seconds must be a finite non-negative number.");
  return cost;
}
