import type { CostRecord, ID } from "../core/contracts";
import type { CompiledGenerationRequest, ProviderCapabilities, ProviderJob, VideoProvider } from "./contract";

export class MockVideoProvider implements VideoProvider {
  readonly id = "mock";
  readonly model = { providerId: "mock", modelId: "mock-video", modelVersion: "1" };
  private jobs = new Map<ID, ProviderJob>();

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      textToVideo: true, imageToVideo: true, referenceImages: true,
      firstFrame: true, lastFrame: true, videoExtension: false,
      nativeAudio: false, deterministicSeed: true,
      supportedAspectRatios: ["16:9", "9:16", "1:1"],
      supportedDurationsSeconds: [5, 8],
    };
  }

  async estimateCost(request: CompiledGenerationRequest): Promise<CostRecord> {
    return { currency: "USD", estimated: request.durationSeconds * 0.01, billableSeconds: request.durationSeconds };
  }

  async submit(request: CompiledGenerationRequest): Promise<ProviderJob> {
    const id = `mock-${this.jobs.size + 1}`;
    const job: ProviderJob = { id, model: this.model, status: "queued" };
    this.jobs.set(id, job);
    return job;
  }

  async getJob(jobId: ID): Promise<ProviderJob> {
    const job = this.jobs.get(jobId);
    if (!job) return { id: jobId, model: this.model, status: "failed", error: { code: "NOT_FOUND", message: "Mock job not found." } };
    return job;
  }
}
