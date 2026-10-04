import type { ContinuityState, ID } from "../core/contracts";

export type ObservationStatus = "match" | "mismatch" | "unknown";

export interface StateObservation {
  dimension: string;
  expected: unknown;
  observed: unknown;
  status: ObservationStatus;
  confidence?: number;
  note?: string;
}

export interface TakeContinuityReview {
  takeId: ID;
  intendedEndState: ContinuityState;
  observedEndState?: ContinuityState;
  observations: StateObservation[];
  reviewer: "human" | "machine-assisted";
  reviewedAt: string;
}

export function continuityScore(review: TakeContinuityReview): number | undefined {
  const known = review.observations.filter((o) => o.status !== "unknown");
  if (!known.length) return undefined;
  const matches = known.filter((o) => o.status === "match").length;
  return matches / known.length;
}

export function canPromoteObservedState(review: TakeContinuityReview): boolean {
  return Boolean(
    review.observedEndState &&
    review.observations.length &&
    review.observations.every((o) => o.status === "match")
  );
}
