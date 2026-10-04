import type { AssetRef } from "../core/contracts";

export function assetDeduplicationKey(asset: AssetRef): string | undefined {
  const checksum = asset.checksum?.trim();
  return checksum ? `${asset.kind}:${checksum}` : undefined;
}

export function sameAssetContent(a: AssetRef, b: AssetRef): boolean {
  const left = assetDeduplicationKey(a);
  return left != null && left === assetDeduplicationKey(b);
}
