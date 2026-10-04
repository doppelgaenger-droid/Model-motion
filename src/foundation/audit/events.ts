import type { ID } from "../core/contracts";

export type AuditEventType =
  | "generation.requested" | "generation.completed" | "generation.failed"
  | "take.approved" | "take.rejected" | "canonical.promoted"
  | "asset.deleted";

export interface AuditEvent {
  id: ID;
  type: AuditEventType;
  occurredAt: string;
  workspaceId?: ID;
  projectId?: ID;
  entityId: ID;
  actorId?: ID;
  metadata?: Record<string, unknown>;
}
