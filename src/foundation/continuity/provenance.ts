import type { ID } from "../core/contracts";

export interface StateChangeProvenance {
  id: ID;
  shotId: ID;
  dimension: string;
  subjectId?: ID;
  previousValue: unknown;
  nextValue: unknown;
  reason: string;
  source: "inheritance" | "intent" | "manual-review" | "machine-observation";
  createdAt: string;
}
