import type { TakeSnapshot } from "./types";

export function assertImmutableTake(existing: TakeSnapshot | undefined): void {
  if (existing) throw new Error(`Take ${existing.id} already exists and is immutable.`);
}

export function assertCanonicalRevision(previousRevision: number | undefined, nextRevision: number): void {
  const expected = (previousRevision ?? 0) + 1;
  if (nextRevision !== expected) throw new Error(`Canonical state revision must be ${expected}; received ${nextRevision}.`);
}
