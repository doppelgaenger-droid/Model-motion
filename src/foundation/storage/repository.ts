import type { ID, Shot } from "../core/contracts";
import type { CanonicalShotState, StoredAsset, TakeSnapshot } from "./types";

export interface MetadataRepository {
  getShot(id: ID): Promise<Shot | undefined>;
  saveShot(shot: Shot): Promise<void>;
  getTake(id: ID): Promise<TakeSnapshot | undefined>;
  createTake(take: TakeSnapshot): Promise<void>;
  getCanonicalState(shotId: ID): Promise<CanonicalShotState | undefined>;
  appendCanonicalState(state: CanonicalShotState): Promise<void>;
  getAsset(id: ID): Promise<StoredAsset | undefined>;
  saveAsset(asset: StoredAsset): Promise<void>;
}

export interface ObjectStore {
  put(storageKey: string, data: Uint8Array, contentType?: string): Promise<void>;
  get(storageKey: string): Promise<Uint8Array>;
  exists(storageKey: string): Promise<boolean>;
}
