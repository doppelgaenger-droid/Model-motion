import type { CameraState } from "../core/contracts";

export interface CameraContinuityIssue {
  code: "AXIS_CHANGE" | "SCREEN_SIDE_CHANGE";
  severity: "warning";
  message: string;
}

export function validateCameraContinuity(
  previous: CameraState | undefined,
  next: CameraState | undefined
): CameraContinuityIssue[] {
  if (!previous || !next) return [];
  const issues: CameraContinuityIssue[] = [];

  if (previous.axis && next.axis && previous.axis !== next.axis) {
    issues.push({ code: "AXIS_CHANGE", severity: "warning", message: `Camera axis changed from ${previous.axis} to ${next.axis}.` });
  }
  if (previous.side && next.side && previous.side !== next.side) {
    issues.push({ code: "SCREEN_SIDE_CHANGE", severity: "warning", message: `Camera side changed from ${previous.side} to ${next.side}.` });
  }
  return issues;
}
