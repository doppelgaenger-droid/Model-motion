import { describe, expect, it } from "vitest";
import { assertContinuity, resolveContinuity } from "../continuity";
import { corridorState } from "../continuity/__tests__/fixtures";
import { compileGenerationRequest } from "../prompt";
import { MockVideoProvider, ProviderOrchestrator } from "../providers/contract";
import { ProviderRegistry } from "../providers/registry";
import { assertExpectedRevision, planTakeApproval } from "../storage";

describe("Foundation failure paths", () => {
  it("blocks unexplained continuity mutations", () => {
    const changed = {
      ...corridorState,
      environment: { ...corridorState.environment, objectStates: { ...corridorState.environment.objectStates, "door-714": "open" } },
    };
    expect(() => assertContinuity(resolveContinuity(corridorState, changed))).toThrow(/Continuity validation failed/);
  });

  it("blocks provider-incompatible generation before submission", async () => {
    const provider = new MockVideoProvider();
    const capabilities = await provider.capabilities();
    const generation = compileGenerationRequest({
      state: corridorState,
      intent: { action: "Remain still.", durationSeconds: 5, aspectRatio: "16:9" },
      references: [], negativeConstraints: [],
    }, { providerId: provider.id, capabilities });
    generation.request.durationSeconds = 99;
    const registry = new ProviderRegistry();
    registry.register(provider);
    await expect(new ProviderOrchestrator(registry).submit(provider.id, generation.request)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("refuses approval of an unfinished take", () => {
    const take = { id: "take-x", shotId: "shot-x", status: "running" } as never;
    expect(() => planTakeApproval(take, corridorState, undefined, "2026-10-04T20:00:00Z")).toThrow(/succeeded/);
  });

  it("detects concurrent revision conflicts", () => {
    expect(() => assertExpectedRevision(4, 5)).toThrow(/Revision conflict/);
  });
});
