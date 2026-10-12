import type { UploadedCreativeAsset } from "./upload";

export const characterIds = ["character-mara-001", "character-lily-001"] as const;
export const referenceSlots = ["identity-reference", "character-board", "full-body-reference"] as const;

export function auditCharacterAssets(assets: readonly UploadedCreativeAsset[]) {
  return characterIds.flatMap(characterId => referenceSlots.map(slot => {
    const matches = assets.filter(asset => asset.type === slot &&
      (asset.characterId === characterId || (asset.owner?.kind === "character" && asset.owner.id === characterId)));
    const paths = matches.map(asset => asset.storagePath);
    return {
      characterId, slot,
      total: matches.length,
      global: matches.filter(asset => asset.characterId === characterId && asset.schemaVersion === 3).length,
      legacy: matches.filter(asset => asset.characterId !== characterId || asset.schemaVersion !== 3).length,
      duplicatePaths: paths.length - new Set(paths).size,
      missingMetadata: matches.filter(asset => !asset.storagePath || !asset.downloadUrl).length,
      ids: matches.map(asset => asset.id),
    };
  }));
}
