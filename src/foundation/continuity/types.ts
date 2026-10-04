import type { CameraState, ContinuityState, ID } from "../core/contracts";

export type ContinuityDimension =
  | "character.identity"
  | "character.appearance"
  | "character.wardrobe"
  | "character.props"
  | "character.position"
  | "character.orientation"
  | "character.hands"
  | "environment.location"
  | "environment.anchors"
  | "environment.objects"
  | "environment.time"
  | "environment.lighting"
  | "environment.weather"
  | "camera";

export interface ContinuityOverride {
  dimension: ContinuityDimension;
  characterId?: ID;
  reason: string;
  intentional: true;
}

export interface ContinuityTransition {
  from: ContinuityState;
  requested: ContinuityState;
  overrides: ContinuityOverride[];
}

export interface ContinuityIssue {
  code: string;
  severity: "error" | "warning";
  dimension: ContinuityDimension;
  message: string;
  characterId?: ID;
}

export interface ContinuityValidation {
  valid: boolean;
  issues: ContinuityIssue[];
}

export interface ContinuityResolution {
  state: ContinuityState;
  validation: ContinuityValidation;
}

export interface CameraContinuityPolicy {
  allowAxisChange: boolean;
  requestedCamera?: CameraState;
}
