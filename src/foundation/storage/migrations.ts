import { FOUNDATION_SCHEMA_VERSION } from "./schema";

export interface SchemaMigration<T = unknown> {
  from: number;
  to: number;
  migrate(data: T): T;
}

export function migrateSchema<T>(data: T, fromVersion: number, migrations: SchemaMigration<T>[], targetVersion = FOUNDATION_SCHEMA_VERSION): T {
  if (fromVersion > targetVersion) throw new Error("Cannot migrate from a newer schema version.");
  let current = fromVersion;
  let value = data;
  while (current < targetVersion) {
    const migration = migrations.find(item => item.from === current && item.to === current + 1);
    if (!migration) throw new Error(`Missing schema migration ${current} -> ${current + 1}.`);
    value = migration.migrate(value);
    current += 1;
  }
  return value;
}
