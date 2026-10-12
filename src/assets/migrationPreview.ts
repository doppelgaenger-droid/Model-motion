import type { UploadedCreativeAsset } from "./upload";
import { characterIds, referenceSlots } from "./audit";

export type MigrationPreview = {
  assetId: string;
  characterId: string;
  slot: string;
  sourcePath: string;
  destinationPath: string;
  status: "already-global" | "candidate" | "conflict" | "invalid";
  reason: string;
};

export function previewCharacterMigration(assets: readonly UploadedCreativeAsset[]): MigrationPreview[] {
  const usedPaths = new Set(assets.map(asset => asset.storagePath));
  return assets.filter(asset =>
    asset.owner?.kind === "character" &&
    characterIds.some(id => id === asset.owner.id) &&
    referenceSlots.some(slot => slot === asset.type)
  ).map(asset => {
    const characterId = asset.owner.id;
    const root = `model-motion/users/${asset.uploadedBy}/characters/${characterId}/${asset.type}/`;
    const sourcePath = asset.storagePath || "";
    const filename = sourcePath.split("/").pop() || "";
    const destinationPath = root + filename;
    const isGlobal = sourcePath.startsWith(root);
    let status: MigrationPreview["status"] = "candidate";
    let reason = "Eligible for copy after manual review";
    if (!asset.uploadedBy || !filename || !sourcePath.startsWith(`model-motion/users/${asset.uploadedBy}/`)) {
      status = "invalid"; reason = "Invalid source path or ownership metadata";
    } else if (isGlobal) {
      status = "already-global"; reason = "Already in global character storage";
    } else if (usedPaths.has(destinationPath)) {
      status = "conflict"; reason = "Destination path already referenced";
    }
    return { assetId: asset.id, characterId, slot: asset.type, sourcePath, destinationPath, status, reason };
  });
}
