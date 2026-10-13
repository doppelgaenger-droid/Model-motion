import { getMetadata, ref } from "firebase/storage";
import { auth, storage } from "../lib/firebase";
import { previewCharacterMigration } from "./migrationPreview";
import type { UploadedCreativeAsset } from "./upload";

export type DestinationCheck = {
  assetId: string;
  status: "empty" | "present" | "unverified";
  detail: string;
};

export async function inspectMigrationDestinations(assets: readonly UploadedCreativeAsset[]): Promise<DestinationCheck[]> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before checking destinations.");
  const rows = previewCharacterMigration(assets).filter(row => row.status === "candidate");
  const result: DestinationCheck[] = [];
  for (const row of rows) {
    if (!row.destinationPath.startsWith(`model-motion/users/${user.uid}/characters/`)) {
      result.push({ assetId: row.assetId, status: "unverified", detail: "Invalid destination ownership" });
      continue;
    }
    try {
      const metadata = await getMetadata(ref(storage, row.destinationPath));
      result.push({ assetId: row.assetId, status: "present", detail: `Existing object: ${metadata.size} bytes; migration source: ${metadata.customMetadata?.migratedFromAssetId ?? "unknown"}` });
    } catch (error) {
      const code = (error as { code?: string }).code;
      result.push({ assetId: row.assetId, status: code === "storage/object-not-found" ? "empty" : "unverified", detail: code ?? "Storage check failed" });
    }
  }
  return result;
}
