import type { ID } from "../core/contracts";
import type { AssetRecord } from "../storage";

export const PROJECT_MANIFEST_VERSION = 1;

export interface PortableProjectManifest {
  manifestVersion: number;
  foundationSchemaVersion: number;
  projectId: ID;
  exportedAt: string;
  assets: Array<Pick<AssetRecord, "id" | "kind" | "checksum" | "storageKey">>;
  records: Record<string, unknown[]>;
}

export function assertPortableManifest(manifest: PortableProjectManifest): void {
  if (manifest.manifestVersion !== PROJECT_MANIFEST_VERSION) throw new Error("Unsupported project manifest version.");
  if (!manifest.projectId.trim()) throw new Error("Project manifest requires projectId.");
}
