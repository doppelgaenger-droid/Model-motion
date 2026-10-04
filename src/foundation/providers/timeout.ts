import { ProviderError } from "./errors";

export async function withProviderTimeout<T>(
  providerId: string,
  operation: Promise<T>,
  timeoutMs: number
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("Provider timeout must be a positive finite number.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ProviderError("TIMEOUT", `Provider ${providerId} exceeded the operation timeout.`, true)), timeoutMs);
  });
  try { return await Promise.race([operation, timeout]); }
  finally { if (timer) clearTimeout(timer); }
}
