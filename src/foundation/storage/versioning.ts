export interface VersionedRecord {
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export function assertIsoTimestamp(value: string, field: string): void {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`${field} must be a valid timestamp.`);
}

export function nextRevision(current: number | undefined): number {
  return (current ?? 0) + 1;
}
