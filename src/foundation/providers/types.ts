import type { CostRecord } from "../core/contracts";
import type { CompiledGenerationRequest, ProviderCapabilities, ProviderJob } from "./contract";

export type ProviderHealth = "available" | "degraded" | "unavailable";

export interface ProviderDescriptor {
  id: string;
  displayName: string;
  model: string;
  capabilities: ProviderCapabilities;
  health: ProviderHealth;
}

export interface ProviderSubmission {
  providerId: string;
  model: string;
  request: CompiledGenerationRequest;
}

export interface ProviderResult {
  job: ProviderJob;
  estimatedCost: CostRecord;
}
