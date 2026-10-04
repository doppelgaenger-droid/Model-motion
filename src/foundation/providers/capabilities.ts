import type { CompiledGenerationRequest, ProviderCapabilities } from "./contract";

export interface CapabilityIssue {
  code: string;
  message: string;
}

export function validateProviderRequest(request: CompiledGenerationRequest, capabilities: ProviderCapabilities): CapabilityIssue[] {
  const issues: CapabilityIssue[] = [];
  if (!capabilities.supportedAspectRatios.includes(request.aspectRatio)) issues.push({ code: "ASPECT_RATIO_UNSUPPORTED", message: `Unsupported aspect ratio: ${request.aspectRatio}` });
  if (!capabilities.supportedDurationsSeconds.includes(request.durationSeconds)) issues.push({ code: "DURATION_UNSUPPORTED", message: `Unsupported duration: ${request.durationSeconds}s` });
  if (request.referenceAssets.length && !capabilities.referenceImages) issues.push({ code: "REFERENCES_UNSUPPORTED", message: "Reference images are unsupported." });
  if (request.firstFrame && !capabilities.firstFrame) issues.push({ code: "FIRST_FRAME_UNSUPPORTED", message: "First-frame conditioning is unsupported." });
  if (request.lastFrame && !capabilities.lastFrame) issues.push({ code: "LAST_FRAME_UNSUPPORTED", message: "Last-frame conditioning is unsupported." });
  return issues;
}
