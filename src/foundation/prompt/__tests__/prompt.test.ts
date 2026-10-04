import { describe, expect, it } from "vitest";
import type { ProviderCapabilities } from "../../providers/contract";
import { corridorState } from "../../continuity/__tests__/fixtures";
import { compileGenerationRequest } from "../adapter";
import type { PromptSpecification } from "../types";

const capabilities: ProviderCapabilities = {
  textToVideo: true,
  imageToVideo: true,
  referenceImages: true,
  firstFrame: true,
  lastFrame: false,
  videoExtension: false,
  nativeAudio: false,
  deterministicSeed: true,
  supportedAspectRatios: ["16:9", "9:16"],
  supportedDurationsSeconds: [5, 8],
};

const specification: PromptSpecification = {
  state: corridorState,
  intent: {
    action: "Character stops in front of the closed door.",
    durationSeconds: 5,
    aspectRatio: "16:9",
    constraints: ["Hands remain empty."],
  },
  references: [{ id: "character-ref", kind: "image", uri: "asset://character-ref" }],
  negativeConstraints: ["Do not open the door."],
};

describe("prompt compiler", () => {
  it("compiles structured state into a provider request", () => {
    const result = compileGenerationRequest(specification, { providerId: "mock", capabilities });
    expect(result.request.durationSeconds).toBe(5);
    expect(result.request.referenceAssets).toHaveLength(1);
    expect(result.compilation.prompt).toContain("door-714");
    expect(result.compilation.constraints).toContain("Do not open the door.");
  });

  it("blocks unsupported duration before provider submission", () => {
    expect(() => compileGenerationRequest(
      { ...specification, intent: { ...specification.intent, durationSeconds: 12 } },
      { providerId: "mock", capabilities }
    )).toThrow(/DURATION_UNSUPPORTED/);
  });

  it("degrades unsupported references to a warning", () => {
    const result = compileGenerationRequest(specification, {
      providerId: "text-only",
      capabilities: { ...capabilities, referenceImages: false },
    });
    expect(result.request.referenceAssets).toHaveLength(0);
    expect(result.warnings).toContain("Provider cannot consume reference images.");
  });
});
