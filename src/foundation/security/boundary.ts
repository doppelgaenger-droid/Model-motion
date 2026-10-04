export type ExecutionBoundary = "client" | "server";

export const SERVER_ONLY_CONCERNS = [
  "provider-credentials",
  "paid-provider-submission",
  "provider-webhooks",
  "privileged-storage-writes",
] as const;

export function assertServerBoundary(boundary: ExecutionBoundary, concern: string): void {
  if (boundary !== "server" && (SERVER_ONLY_CONCERNS as readonly string[]).includes(concern)) {
    throw new Error(`${concern} is server-only.`);
  }
}
