import type { ContinuityState, ID } from "../core/contracts";
import type { CanonicalShotState, TakeSnapshot } from "./types";
import { assertCanonicalRevision } from "./immutability";

export interface ApprovalPlan {
  take: TakeSnapshot;
  canonicalState: CanonicalShotState;
}

export function planTakeApproval(
  take: TakeSnapshot,
  observedEndState: ContinuityState,
  previousRevision: number | undefined,
  createdAt: string
): ApprovalPlan {
  if (take.status !== "succeeded") throw new Error("Only a succeeded take can be approved.");
  assertCanonicalRevision(previousRevision, (previousRevision ?? 0) + 1);
  return {
    take: { ...take, status: "approved", observedEndState },
    canonicalState: {
      shotId: take.shotId,
      state: observedEndState,
      sourceTakeId: take.id,
      revision: (previousRevision ?? 0) + 1,
      createdAt,
    },
  };
}

export interface ApprovalWriter {
  approveTakeAndAppendCanonicalState(takeId: ID, plan: ApprovalPlan): Promise<void>;
}
