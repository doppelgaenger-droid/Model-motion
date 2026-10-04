export class RevisionConflictError extends Error {
  constructor(public readonly expected: number, public readonly actual: number) {
    super(`Revision conflict: expected ${expected}, actual ${actual}.`);
    this.name = "RevisionConflictError";
  }
}

export function assertExpectedRevision(expected: number, actual: number): void {
  if (expected !== actual) throw new RevisionConflictError(expected, actual);
}
