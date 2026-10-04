import type { CostRecord } from "../core/contracts";
import type { CompiledGenerationRequest, ProviderCapabilities, ProviderJob, ProviderModelIdentity } from "./contract";

export type ProviderHealth = "available" | "degraded" | "unavailable";

export interface ProviderDescriptor {
  id: string;
  displayName: string;
  model: ProviderModelIdentity;
  capabilities: ProviderCapabilities;
  health: ProviderHealth;
}

export interface ProviderSubmission {
  providerId: string;
  model: ProviderModelIdentity;
  request: CompiledGenerationRequest;
}

export interface ProviderResult {
  job: ProviderJob;
  estimatedCost: CostRecord;
}
