import { ProviderError } from "./errors";

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export function retryDelayMs(attempt: number, policy: RetryPolicy): number {
  return Math.min(policy.baseDelayMs * 2 ** Math.max(0, attempt - 1), policy.maxDelayMs);
}

export async function withProviderRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      lastError = error;
      if (!(error instanceof ProviderError) || !error.retryable || attempt === policy.maxAttempts) throw error;
      await wait(retryDelayMs(attempt, policy));
    }
  }
  throw lastError;
}
