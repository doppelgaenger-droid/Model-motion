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
  references: [{ role: "identity", asset: { id: "character-ref", kind: "image", uri: "asset://character-ref" } }],
  styleBible: { visual: ["restrained cinematic realism"], forbidden: ["unmotivated wardrobe changes"] },
  negativeConstraints: ["Do not open the door."],
};

describe("prompt compiler", () => {
  it("compiles structured state into a provider request", () => {
    const result = compileGenerationRequest(specification, { providerId: "mock", capabilities });
    expect(result.request.durationSeconds).toBe(5);
    expect(result.request.referenceAssets).toHaveLength(1);
    expect(result.compilation.prompt).toContain("door-714");
    expect(result.compilation.constraints).toContain("Do not open the door.");
    expect(result.compilation.prompt).toContain("restrained cinematic realism");
  });

  it("blocks unsupported duration before provider submission", () => {
    expect(() => compileGenerationRequest(
      { ...specification, intent: { ...specification.intent, durationSeconds: 12 } },
      { providerId: "mock", capabilities }
    )).toThrow(/DURATION_UNSUPPORTED/);
  });

  it("preserves first-frame conditioning at the provider boundary", () => {
    const result = compileGenerationRequest(
      { ...specification, references: [{ role: "first-frame", asset: { id: "frame-1", kind: "image", uri: "asset://frame-1" } }] },
      { providerId: "mock", capabilities }
    );
    expect(result.request.firstFrame?.id).toBe("frame-1");
  });

  it("blocks unsupported first-frame conditioning", () => {
    expect(() => compileGenerationRequest(
      { ...specification, references: [{ role: "first-frame", asset: { id: "frame-1", kind: "image", uri: "asset://frame-1" } }] },
      { providerId: "no-first-frame", capabilities: { ...capabilities, firstFrame: false } }
    )).toThrow(/FIRST_FRAME_UNSUPPORTED/);
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
