import type { ID } from "../core/contracts";
import type { ContinuityDimension } from "./types";

export interface ContinuityLock {
  dimension: ContinuityDimension;
  characterId?: ID;
  scope: "project" | "scene" | "shot";
  reason: string;
}

export function isLocked(
  locks: ContinuityLock[],
  dimension: ContinuityDimension,
  characterId?: ID
): boolean {
  return locks.some(
    (lock) =>
      lock.dimension === dimension &&
      (lock.characterId === characterId || (!lock.characterId && !characterId))
  );
}
