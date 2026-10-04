import type { PromptCompilation, PromptCompilationContext, PromptSpecification } from "./types";

export const PROMPT_COMPILER_VERSION = "foundation-0.2";

export function compilePromptSpecification(
  specification: PromptSpecification,
  context: PromptCompilationContext
): PromptCompilation {
  const { state, intent } = specification;
  const characters = state.characters.map((character) =>
    [
      `${character.characterId} identity ${character.identityVersion}`,
      `wardrobe: ${character.wardrobeIds.join(", ") || "none"}`,
      `props: ${character.propIds.join(", ") || "none"}`,
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
    "Do not invent continuity changes that are not specified in the structured state.",
    context.capabilities.referenceImages ? "Preserve identities from supplied references." : "",
  ].filter(Boolean).join("\n");

  const diagnostics: string[] = [];
  if (specification.references.length && !context.capabilities.referenceImages) {
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
    referenceAssets: context.capabilities.referenceImages ? specification.references : [],
    diagnostics,
  };
}
