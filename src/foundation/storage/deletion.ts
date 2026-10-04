export interface Tombstone {
  deletedAt: string;
  deletedBy?: string;
  reason?: string;
}

export interface SoftDeletable {
  tombstone?: Tombstone;
}

export function isDeleted(record: SoftDeletable): boolean {
  return record.tombstone != null;
}

export function createTombstone(deletedAt: string, reason?: string, deletedBy?: string): Tombstone {
  if (Number.isNaN(Date.parse(deletedAt))) throw new Error("deletedAt must be a valid timestamp.");
  return { deletedAt, reason, deletedBy };
}
