import type { PromptCompilation, PromptCompilationContext, PromptSpecification } from "./types";

export const PROMPT_COMPILER_VERSION = "foundation-0.3";

export function compilePromptSpecification(
  specification: PromptSpecification,
  context: PromptCompilationContext
): PromptCompilation {
  const { state, intent, styleBible } = specification;
  const characters = state.characters.map((character) =>
    [
      `${character.characterId} identity ${character.identityVersion}`,
      `wardrobe: ${character.wardrobeIds.join(", ") || "none"}`,
      `props: ${character.propIds.join(", ") || "none"}`,
      `hands: ${JSON.stringify(character.handState ?? {})}`,
      `position: ${character.position ?? "unspecified"}`,
      `orientation: ${character.orientation ?? "unspecified"}`,
    ].join("; ")
  );

  const prompt = [
    "CONTINUITY STATE",
    ...characters,
    `Location: ${state.environment.locationId}`,
    `Spatial anchors: ${JSON.stringify(state.environment.spatialAnchors)}`,
    `Object states: ${JSON.stringify(state.environment.objectStates)}`,
    state.environment.timeOfDay ? `Time: ${state.environment.timeOfDay}` : "",
    state.environment.lighting ? `Lighting: ${state.environment.lighting}` : "",
    state.environment.weather ? `Weather: ${state.environment.weather}` : "",
    state.camera ? `Canonical camera: ${JSON.stringify(state.camera)}` : "",
    styleBible ? `Project style: ${JSON.stringify(styleBible)}` : "",
    "",
    "SHOT INTENT",
    `Action: ${intent.action}`,
    intent.performance ? `Performance: ${intent.performance}` : "",
    intent.camera ? `Camera: ${JSON.stringify(intent.camera)}` : "",
    intent.dialogue?.length ? `Dialogue: ${JSON.stringify(intent.dialogue)}` : "",
  ].filter(Boolean).join("\n");

  const constraints = [
    ...(intent.constraints ?? []),
    ...specification.negativeConstraints,
    ...(specification.providerConstraints ?? []),
    ...(styleBible?.forbidden ?? []),
    "Do not invent continuity changes that are not specified in the structured state.",
    context.capabilities.referenceImages ? "Preserve identities from supplied references." : "",
  ].filter(Boolean).join("\n");

  const firstFrame = context.capabilities.firstFrame ? specification.references.find((r) => r.role === "first-frame")?.asset : undefined;
  const lastFrame = context.capabilities.lastFrame ? specification.references.find((r) => r.role === "last-frame")?.asset : undefined;
  const referenceAssets = context.capabilities.referenceImages ? specification.references.filter((r) => r.role !== "first-frame" && r.role !== "last-frame").map((r) => r.asset) : [];

  const diagnostics: string[] = [];
  if (specification.references.some((r) => r.role !== "first-frame" && r.role !== "last-frame") && !context.capabilities.referenceImages) {
    diagnostics.push(`Provider ${context.providerId} does not support reference images.`);
  }
  if (intent.dialogue?.length && !context.capabilities.nativeAudio) {
    diagnostics.push(`Provider ${context.providerId} has no native audio capability; dialogue requires a separate audio path.`);
  }

  return {
    prompt,
    constraints,
    compilerVersion: PROMPT_COMPILER_VERSION,
    providerId: context.providerId,
    referenceAssets,
    firstFrame,
    lastFrame,
    diagnostics,
  };
}
