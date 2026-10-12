import { getMetadata, ref } from "firebase/storage";
import { storage } from "../lib/firebase";
import type { UploadedCreativeAsset } from "./upload";

export type StorageCheck = {
  id: string;
  status: "verified" | "missing" | "denied" | "invalid" | "error";
  details: string;
};

export async function verifyStorageObjects(assets: readonly UploadedCreativeAsset[]): Promise<StorageCheck[]> {
  const checks: StorageCheck[] = [];
  for (const asset of assets) {
    if (!asset.storagePath || !asset.uploadedBy ||
      !asset.storagePath.startsWith(`model-motion/users/${asset.uploadedBy}/`)) {
      checks.push({ id: asset.id, status: "invalid", details: "Missing or invalid storage path" });
      continue;
    }
    try {
      const metadata = await getMetadata(ref(storage, asset.storagePath));
      checks.push({ id: asset.id, status: "verified", details: `Object exists · ${metadata.size} bytes` });
    } catch (error) {
      const code = (error as { code?: string }).code;
      const status = code === "storage/object-not-found" ? "missing" :
        code === "storage/unauthorized" ? "denied" : "error";
      checks.push({ id: asset.id, status, details: code ?? "Storage verification failed" });
    }
  }
  return checks;
}
