import type { CompiledGenerationRequest } from "./contract";

export interface IdempotentGenerationRequest {
  idempotencyKey: string;
  request: CompiledGenerationRequest;
}

export function assertIdempotencyKey(key: string): string {
  const normalized = key.trim();
  if (!normalized) throw new Error("Idempotency key is required for provider submission.");
  return normalized;
}
