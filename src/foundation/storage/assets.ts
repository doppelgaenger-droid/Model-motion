import type { AssetRef, ID } from "../core/contracts";
import type { StoredAsset } from "./types";

export type AssetLifecycle = "pending" | "available" | "archived" | "deleted";

export interface AssetRecord extends StoredAsset {
  lifecycle: AssetLifecycle;
  ownerProjectId: ID;
  sourceTakeId?: ID;
}

export function assertPersistableAsset(asset: AssetRef): void {
  if (!asset.id.trim()) throw new Error("Asset id is required.");
  if (!asset.uri.trim()) throw new Error("Asset URI is required.");
}

export function canTransitionAsset(from: AssetLifecycle, to: AssetLifecycle): boolean {
  if (from === to) return true;
  if (from === "deleted") return false;
  if (from === "pending") return to === "available" || to === "deleted";
  if (from === "available") return to === "archived" || to === "deleted";
  if (from === "archived") return to === "available" || to === "deleted";
  return false;
}
