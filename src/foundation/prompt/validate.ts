import type { PromptCompilationContext, PromptSpecification } from "./types";

export interface PromptValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
}

export interface PromptValidation {
  valid: boolean;
  issues: PromptValidationIssue[];
}

export function validatePromptSpecification(
  specification: PromptSpecification,
  context: PromptCompilationContext
): PromptValidation {
  const issues: PromptValidationIssue[] = [];
  const { intent } = specification;
  const { capabilities } = context;
  const firstFrames = specification.references.filter((r) => r.role === "first-frame");
  const lastFrames = specification.references.filter((r) => r.role === "last-frame");
  const standardReferences = specification.references.filter((r) => r.role !== "first-frame" && r.role !== "last-frame");

  if (!intent.action.trim()) {
    issues.push({ severity: "error", code: "EMPTY_ACTION", message: "Shot action is required." });
  }
  if (firstFrames.length > 1) issues.push({ severity: "error", code: "MULTIPLE_FIRST_FRAMES", message: "Only one first-frame reference is allowed." });
  if (lastFrames.length > 1) issues.push({ severity: "error", code: "MULTIPLE_LAST_FRAMES", message: "Only one last-frame reference is allowed." });
  if (firstFrames.length && !capabilities.firstFrame) issues.push({ severity: "error", code: "FIRST_FRAME_UNSUPPORTED", message: "Provider cannot consume a first-frame reference." });
  if (lastFrames.length && !capabilities.lastFrame) issues.push({ severity: "error", code: "LAST_FRAME_UNSUPPORTED", message: "Provider cannot consume a last-frame reference." });
  if (standardReferences.length && !capabilities.referenceImages) {
    issues.push({ severity: "warning", code: "REFERENCES_UNSUPPORTED", message: "Provider cannot consume reference images." });
  }
  if (intent.dialogue?.length && !capabilities.nativeAudio) {
    issues.push({ severity: "warning", code: "AUDIO_UNSUPPORTED", message: "Dialogue requires a separate audio path." });
  }
  if (intent.aspectRatio && !capabilities.supportedAspectRatios.includes(intent.aspectRatio)) {
    issues.push({ severity: "error", code: "ASPECT_RATIO_UNSUPPORTED", message: `Unsupported aspect ratio: ${intent.aspectRatio}.` });
  }
  if (intent.durationSeconds != null && !capabilities.supportedDurationsSeconds.includes(intent.durationSeconds)) {
    issues.push({ severity: "error", code: "DURATION_UNSUPPORTED", message: `Unsupported duration: ${intent.durationSeconds}s.` });
  }

  return { valid: !issues.some((issue) => issue.severity === "error"), issues };
}
