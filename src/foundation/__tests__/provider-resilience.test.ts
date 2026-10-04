import { describe, expect, it } from "vitest";
import type { CompiledGenerationRequest, VideoProvider } from "../providers/contract";
import { MockVideoProvider, ProviderError, assertRetryableSubmission, withProviderRetry } from "../providers/contract";

const request = (idempotencyKey?: string): CompiledGenerationRequest => ({
  prompt: "test",
  aspectRatio: "16:9",
  durationSeconds: 5,
  referenceAssets: [],
  parameters: {},
  idempotencyKey,
});

describe("provider resilience invariants", () => {
  it("requires idempotency before a paid submission can be retried", () => {
    expect(() => assertRetryableSubmission(request().idempotencyKey)).toThrow(/idempotency key/);
    expect(() => assertRetryableSubmission(request("take-001").idempotencyKey)).not.toThrow();
  });

  it("retries only retryable provider failures and remains bounded", async () => {
    let attempts = 0;
    const waits: number[] = [];
    const result = await withProviderRetry(async () => {
      attempts += 1;
      if (attempts < 3) throw new ProviderError("TIMEOUT", "temporary", true);
      return "ok";
    }, { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 20 }, async (ms) => { waits.push(ms); });
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(waits).toEqual([10, 20]);
  });

  it("does not retry permanent provider failures", async () => {
    let attempts = 0;
    await expect(withProviderRetry(async () => {
      attempts += 1;
      throw new ProviderError("AUTHENTICATION", "bad credentials", false);
    }, { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 20 }, async () => {})).rejects.toMatchObject({ code: "AUTHENTICATION" });
    expect(attempts).toBe(1);
  });

  it("keeps provider model identity stable for provenance", () => {
    const provider: VideoProvider = new MockVideoProvider();
    expect(provider.model).toEqual({ providerId: "mock", modelId: "mock-video", modelVersion: "1" });
  });
});
