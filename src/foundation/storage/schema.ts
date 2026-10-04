export const FOUNDATION_SCHEMA_VERSION = 1;

export interface SchemaEnvelope<T> {
  schemaVersion: number;
  data: T;
}

export function assertSupportedSchemaVersion(version: number): void {
  if (version !== FOUNDATION_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version ${version}; expected ${FOUNDATION_SCHEMA_VERSION}.`);
  }
}
