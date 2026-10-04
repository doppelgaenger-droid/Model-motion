import type { CompiledGenerationRequest } from "./contract";
import { ProviderError } from "./errors";
import { normalizeProviderError } from "./error-normalization";
import { validateProviderRequest } from "./capabilities";
import { validateCostRecord } from "./cost";
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
      const capabilities = await provider.capabilities();
      const capabilityIssues = validateProviderRequest(request, capabilities);
      if (capabilityIssues.length) throw new ProviderError("INVALID_REQUEST", capabilityIssues.map((issue) => issue.message).join("\n"));
      const estimatedCost = validateCostRecord(await provider.estimateCost(request));
      const job = await provider.submit(request);
      return { job, estimatedCost };
    } catch (cause) {
      throw normalizeProviderError(providerId, cause);
    }
  }

  async refresh(providerId: string, jobId: string) {
    try {
      return await this.registry.get(providerId).getJob(jobId);
    } catch (cause) {
      throw normalizeProviderError(providerId, cause);
    }
  }
}
