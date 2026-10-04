import type { ContinuityState, ShotIntent } from "./types";
import type { ProviderCapabilities } from "./provider";

export interface PromptCompilation {
  prompt: string;
  constraints: string;
  compilerVersion: string;
}

export function compilePrompt(
  state: ContinuityState,
  intent: ShotIntent,
  capabilities: ProviderCapabilities
): PromptCompilation {
  const characters = state.characters
    .map((c) => `${c.characterId} identity ${c.identityVersion}; wardrobe: ${c.wardrobeIds.join(", ") || "none"}; props: ${c.propIds.join(", ") || "none"}; position: ${c.position ?? "unspecified"}; orientation: ${c.orientation ?? "unspecified"}`)
    .join("\n");

  const prompt = [
    "CONTINUITY STATE",
    characters,
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
    "Do not invent continuity changes that are not specified in the structured state.",
    capabilities.referenceImages ? "Preserve identities from supplied references." : "",
  ].filter(Boolean).join("\n");

  return { prompt, constraints, compilerVersion: "foundation-0.1" };
}
