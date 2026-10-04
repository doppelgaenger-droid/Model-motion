import { describe, expect, it } from "vitest";
import { ProviderRegistry } from "../registry";
import { ProviderOrchestrator } from "../orchestrator";
import { MockVideoProvider } from "../mock";

const request = {
  prompt: "test",
  aspectRatio: "16:9",
  durationSeconds: 5,
  referenceAssets: [],
  parameters: {},
};

describe("provider foundation", () => {
  it("registers and submits through a provider without leaking implementation details", async () => {
    const registry = new ProviderRegistry();
    registry.register(new MockVideoProvider());
    const result = await new ProviderOrchestrator(registry).submit("mock", request);
    expect(result.job.status).toBe("queued");
    expect(result.estimatedCost.estimated).toBe(0.05);
  });

  it("normalizes unknown-provider failures", async () => {
    const registry = new ProviderRegistry();
    await expect(new ProviderOrchestrator(registry).submit("missing", request)).rejects.toMatchObject({ code: "UNKNOWN_PROVIDER" });
  });
});
