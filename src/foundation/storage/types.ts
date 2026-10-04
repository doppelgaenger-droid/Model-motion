import type { AssetRef, ContinuityState, ID, Shot, Take } from "../core/contracts";

export interface StoredAsset extends AssetRef {
  storageKey: string;
  byteSize?: number;
  createdAt: string;
}

export interface CanonicalShotState {
  shotId: ID;
  state: ContinuityState;
  sourceTakeId: ID;
  revision: number;
  createdAt: string;
}

export interface TakeSnapshot extends Take {
  shotSnapshot: Shot;
  canonicalInputState: ContinuityState;
  intendedEndState: ContinuityState;
  observedEndState?: ContinuityState;
}

export interface StorageBoundary {
  metadata: "database";
  media: "object-storage";
}
