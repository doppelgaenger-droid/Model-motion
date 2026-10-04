import type { ID } from "../core/contracts";
import type { AssetRecord } from "./assets";
import type { TakeSnapshot } from "./types";

export function referencedAssetIds(take: TakeSnapshot): Set<ID> {
  return new Set([
    ...take.provenance.referenceAssetIds,
    ...(take.provenance.firstFrameAssetId ? [take.provenance.firstFrameAssetId] : []),
    ...(take.provenance.lastFrameAssetId ? [take.provenance.lastFrameAssetId] : []),
    ...take.outputAssetIds,
  ]);
}

export function orphanAssetIds(assets: AssetRecord[], takes: TakeSnapshot[]): ID[] {
  const referenced = new Set<ID>();
  for (const take of takes) for (const id of referencedAssetIds(take)) referenced.add(id);
  return assets.filter((asset) => !referenced.has(asset.id)).map((asset) => asset.id);
}
