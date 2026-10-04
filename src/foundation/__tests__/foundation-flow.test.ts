import { describe, expect, it } from "vitest";
import { assertContinuity, resolveContinuity } from "../continuity";
import { corridorState } from "../continuity/__tests__/fixtures";
import { compileGenerationRequest } from "../prompt";
import { MockVideoProvider, ProviderOrchestrator } from "../providers/contract";
import { ProviderRegistry } from "../providers/registry";
import { planTakeApproval } from "../storage";
import type { PromptSpecification } from "../prompt";
import type { TakeSnapshot } from "../storage";

describe("Foundation end-to-end contract", () => {
  it("flows continuity through prompt provider take approval and canonical promotion", async () => {
    const continuity = resolveContinuity(corridorState, corridorState);
    expect(continuity.validation.valid).toBe(true);
    assertContinuity(continuity);

    const provider = new MockVideoProvider();
    const capabilities = await provider.capabilities();
    const specification: PromptSpecification = {
      state: continuity.state,
      intent: { action: "Character remains still in front of the closed door.", durationSeconds: 5, aspectRatio: "16:9" },
      references: [],
      negativeConstraints: ["Do not open the door."],
    };
    const generation = compileGenerationRequest(specification, { providerId: provider.id, capabilities }, { seed: 7 });
    generation.request.idempotencyKey = "take-e2e-1";

    const registry = new ProviderRegistry();
    registry.register(provider);
    const submitted = await new ProviderOrchestrator(registry).submit(provider.id, generation.request);
    expect(submitted.job.status).toBe("queued");

    const take = {
      id: "take-e2e-1",
      shotId: "shot-e2e-1",
      status: "succeeded",
      provenance: {
        providerId: provider.model.providerId,
        modelId: provider.model.modelId,
        modelVersion: provider.model.modelVersion,
        promptCompilerVersion: generation.compilation.compilerVersion,
        requestParameters: generation.request.parameters,
        referenceAssetIds: [],
        idempotencyKey: generation.request.idempotencyKey,
      },
      compiledPrompt: generation.compilation.prompt,
      compiledConstraints: generation.compilation.constraints,
      outputAssetIds: ["video-e2e-1"],
      cost: submitted.estimatedCost,
      createdAt: "2026-10-04T20:00:00Z",
      completedAt: "2026-10-04T20:01:00Z",
      shotSnapshot: {
        id: "shot-e2e-1", sceneId: "scene-e2e-1", order: 1,
        inputState: continuity.state, intent: specification.intent, endStateTarget: continuity.state,
      },
      canonicalInputState: continuity.state,
      intendedEndState: continuity.state,
    } satisfies TakeSnapshot;

    const approval = planTakeApproval(take, continuity.state, undefined, "2026-10-04T20:02:00Z");
    expect(approval.take.status).toBe("approved");
    expect(approval.canonicalState.sourceTakeId).toBe(take.id);
    expect(approval.canonicalState.revision).toBe(1);
    expect(approval.canonicalState.state.environment.objectStates["door-714"]).toBe("closed");
  });
});
