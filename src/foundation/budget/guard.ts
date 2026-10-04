import type { CostRecord } from "../core/contracts";

export interface GenerationBudget {
  currency: CostRecord["currency"];
  maxEstimatedCost: number;
}

export function assertWithinGenerationBudget(cost: CostRecord, budget: GenerationBudget): void {
  if (cost.currency !== budget.currency) throw new Error("Budget currency mismatch.");
  if (!Number.isFinite(budget.maxEstimatedCost) || budget.maxEstimatedCost < 0) throw new Error("Invalid generation budget.");
  if (cost.estimated > budget.maxEstimatedCost) throw new Error(`Estimated generation cost ${cost.estimated} exceeds budget ${budget.maxEstimatedCost}.`);
}
