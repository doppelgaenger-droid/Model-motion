import { ProviderError } from "./errors";

export interface RawProviderError {
  status?: number;
  code?: string;
  message?: string;
}

export function normalizeProviderError(providerId: string, error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const raw = typeof error === "object" && error !== null ? error as RawProviderError : {};
  const message = raw.message ?? `Provider ${providerId} failed.`;
  if (raw.status === 401 || raw.status === 403) return new ProviderError("AUTHENTICATION", message, false, error);
  if (raw.status === 429) return new ProviderError("RATE_LIMIT", message, true, error);
  if (raw.status === 408) return new ProviderError("TIMEOUT", message, true, error);
  if (raw.status != null && raw.status >= 500) return new ProviderError("PROVIDER_FAILURE", message, true, error);
  return new ProviderError("PROVIDER_FAILURE", message, false, error);
}
