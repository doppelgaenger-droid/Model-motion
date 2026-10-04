import type { ContinuityState, Shot } from "./types";

export function resolveShotInput(
  previousApprovedEndState: ContinuityState | undefined,
  explicitInput: ContinuityState
): ContinuityState {
  // Foundation rule: explicit structured state is authoritative.
  // Deep merging is deliberately deferred until each continuity dimension
  // has a documented merge policy; silent inference would recreate the
  // exact continuity problem Model Motion exists to prevent.
  return previousApprovedEndState ?? explicitInput;
}

export function approveTake(
  shot: Shot,
  takeId: string,
  resolvedEndState: ContinuityState
): Shot {
  return {
    ...shot,
    approvedTakeId: takeId,
    resolvedEndState,
  };
}

export function nextCanonicalState(shot: Shot): ContinuityState {
  if (!shot.approvedTakeId || !shot.resolvedEndState) {
    throw new Error("Shot has no approved canonical end state.");
  }
  return shot.resolvedEndState;
}
