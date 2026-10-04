import type { AssetRef, CostRecord, ID } from "./types";

export interface ProviderCapabilities {
  textToVideo: boolean;
  imageToVideo: boolean;
  referenceImages: boolean;
  firstFrame: boolean;
  lastFrame: boolean;
  videoExtension: boolean;
  nativeAudio: boolean;
  deterministicSeed: boolean;
  supportedAspectRatios: string[];
  supportedDurationsSeconds: number[];
}

export interface CompiledGenerationRequest {
  prompt: string;
  constraints?: string;
  aspectRatio: string;
  durationSeconds: number;
  referenceAssets: AssetRef[];
  firstFrame?: AssetRef;
  lastFrame?: AssetRef;
  parameters: Record<string, unknown>;
}

export interface ProviderJob {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  outputs?: AssetRef[];
  error?: { code: string; message: string };
  cost?: CostRecord;
}

export interface VideoProvider {
  readonly id: string;
  capabilities(): Promise<ProviderCapabilities>;
  estimateCost(request: CompiledGenerationRequest): Promise<CostRecord>;
  submit(request: CompiledGenerationRequest): Promise<ProviderJob>;
  getJob(jobId: ID): Promise<ProviderJob>;
}
