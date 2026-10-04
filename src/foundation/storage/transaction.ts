export interface MetadataTransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface TransactionalMetadataRepository {
  transaction<T>(work: (transaction: MetadataTransaction) => Promise<T>): Promise<T>;
}
