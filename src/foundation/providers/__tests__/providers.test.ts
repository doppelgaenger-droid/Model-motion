import { describe, expect, it } from "vitest";
import { ProviderRegistry } from "../registry";
import { ProviderOrchestrator } from "../orchestrator";
import { MockVideoProvider } from "../mock";
import { canTransitionProviderJob, isTerminalProviderJob } from "../lifecycle";
import { normalizeProviderError } from "../error-normalization";
import { assertRetryableSubmission, retryDelayMs } from "../retry";
import { assertIdempotencyKey } from "../idempotency";

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
  it("blocks impossible provider requests before submission", async () => {
    const registry = new ProviderRegistry();
    registry.register(new MockVideoProvider());
    await expect(new ProviderOrchestrator(registry).submit("mock", { ...request, durationSeconds: 99 })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("enforces terminal job lifecycle", () => {
    expect(canTransitionProviderJob("queued", "running")).toBe(true);
    expect(canTransitionProviderJob("succeeded", "running")).toBe(false);
    expect(isTerminalProviderJob({ id: "x", status: "failed" })).toBe(true);
  });

  it("normalizes rate limits as retryable", () => {
    expect(normalizeProviderError("mock", { status: 429, message: "slow down" })).toMatchObject({ code: "RATE_LIMIT", retryable: true });
  });
  it("uses bounded exponential retry delays", () => {
    const policy = { maxAttempts: 4, baseDelayMs: 100, maxDelayMs: 250 };
    expect([1, 2, 3].map((attempt) => retryDelayMs(attempt, policy))).toEqual([100, 200, 250]);
  });

  it("requires idempotency before retrying paid submissions", () => {
    expect(() => assertRetryableSubmission()).toThrow(/idempotency key/);
    expect(() => assertRetryableSubmission("take-001")).not.toThrow();
  });

  it("rejects empty idempotency keys", () => {
    expect(() => assertIdempotencyKey("   ")).toThrow(/Idempotency key/);
  });
});
