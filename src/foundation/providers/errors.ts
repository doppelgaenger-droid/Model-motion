export type ProviderErrorCode =
  | "UNKNOWN_PROVIDER"
  | "UNAVAILABLE"
  | "INVALID_REQUEST"
  | "AUTHENTICATION"
  | "RATE_LIMIT"
  | "QUOTA"
  | "TIMEOUT"
  | "PROVIDER_FAILURE";

export class ProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly retryable = false,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
