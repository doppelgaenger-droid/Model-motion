import type { CompiledGenerationRequest } from "./contract";
import { ProviderError } from "./errors";
import type { ProviderResult } from "./types";
import { ProviderRegistry } from "./registry";

export class ProviderOrchestrator {
  constructor(private readonly registry: ProviderRegistry) {}

  async submit(providerId: string, request: CompiledGenerationRequest): Promise<ProviderResult> {
    let provider;
    try {
      provider = this.registry.get(providerId);
    } catch (cause) {
      throw new ProviderError("UNKNOWN_PROVIDER", `Unknown provider: ${providerId}`, false, cause);
    }

    try {
      const estimatedCost = await provider.estimateCost(request);
      const job = await provider.submit(request);
      return { job, estimatedCost };
    } catch (cause) {
      if (cause instanceof ProviderError) throw cause;
      throw new ProviderError("PROVIDER_FAILURE", `Provider ${providerId} submission failed.`, true, cause);
    }
  }

  async refresh(providerId: string, jobId: string) {
    try {
      return await this.registry.get(providerId).getJob(jobId);
    } catch (cause) {
      if (cause instanceof ProviderError) throw cause;
      throw new ProviderError("PROVIDER_FAILURE", `Provider ${providerId} job refresh failed.`, true, cause);
    }
  }
}
