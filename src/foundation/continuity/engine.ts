import type { ContinuityState } from "../core/contracts";
import { mergeContinuityState } from "./merge";
import type { ContinuityOverride, ContinuityResolution } from "./types";
import { validateContinuityTransition } from "./validate";

export function resolveContinuity(previousApprovedState: ContinuityState, requestedState: ContinuityState, overrides: ContinuityOverride[] = []): ContinuityResolution {
  const state = mergeContinuityState(previousApprovedState, requestedState);
  return { state, validation: validateContinuityTransition(previousApprovedState,state,overrides) };
}

export function assertContinuity(resolution: ContinuityResolution): ContinuityState {
  if (!resolution.validation.valid) {
    const summary=resolution.validation.issues.filter(i=>i.severity==="error").map(i=>i.message).join(" ");
    throw new Error(`Continuity validation failed. ${summary}`);
  }
  return resolution.state;
}
