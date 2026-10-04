import type { ID } from "../core/contracts";

export interface GenerationTelemetry {
  generationId: ID;
  providerId: string;
  modelId: string;
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  latencyMs?: number;
  providerDurationMs?: number;
  errorCode?: string;
  estimatedCost?: number;
  actualCost?: number;
  currency?: "USD" | "EUR";
}
