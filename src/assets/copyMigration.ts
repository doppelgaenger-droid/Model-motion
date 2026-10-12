import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { getBlob, getDownloadURL, getMetadata, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";
import { previewCharacterMigration } from "./migrationPreview";
import type { UploadedCreativeAsset } from "./upload";

async function sha256(blob: Blob): Promise<string> {
  const bytes = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function copyCharacterReferences(
  assets: readonly UploadedCreativeAsset[],
  onProgress: (done: number, total: number) => void,
): Promise<{ copied: number; skipped: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before migrating references.");
  const preview = previewCharacterMigration(assets);
  if (preview.some(row => row.status === "invalid" || row.status === "conflict")) {
    throw new Error("Resolve all invalid records and conflicts before migration.");
  }
  const candidates = preview.filter(row => row.status === "candidate");
  if (!candidates.length) return { copied: 0, skipped: preview.length };
  if (candidates.some(row => assets.find(asset => asset.id === row.assetId)?.uploadedBy !== user.uid)) {
    throw new Error("Asset owner does not match the authenticated user.");
  }
  const current = await getDocs(query(collection(db, "creativeAssets"), where("uploadedBy", "==", user.uid)));
  const existing = current.docs.map(item => item.data());
  for (const row of candidates) {
    if (existing.some(record => record.storagePath === row.destinationPath || record.migratedFromAssetId === row.assetId)) {
      throw new Error(`Migration already registered for ${row.assetId}; refresh the inventory before retrying.`);
    }
  }
  let copied = 0;
  onProgress(0, candidates.length);
  for (const row of candidates) {
    const original = assets.find(asset => asset.id === row.assetId);
    if (!original || original.owner.kind !== "character") throw new Error("Invalid character asset.");
    const source = ref(storage, row.sourcePath);
    if (!row.sourcePath.startsWith(`model-motion/users/${user.uid}/projects/`) || !row.destinationPath.startsWith(`model-motion/users/${user.uid}/characters/${row.characterId}/${row.slot}/`)) {
      throw new Error(`Unexpected migration path for ${row.assetId}`);
    }
    const destination = ref(storage, row.destinationPath);
    const sourceMetadata = await getMetadata(source);
    if (sourceMetadata.size !== original.size) throw new Error(`Source size mismatch for ${row.assetId}`);
    try {
      await getMetadata(destination);
      throw new Error(`Destination already exists: ${row.destinationPath}`);
    } catch (error) {
      if ((error as { code?: string }).code !== "storage/object-not-found") throw error;
    }
    const blob = await getBlob(source);
    const sourceHash = await sha256(blob);
    await uploadBytes(destination, blob, { contentType: original.mimeType, customMetadata: { migratedFromAssetId: original.id, sourceSha256: sourceHash } });
    const copiedBlob = await getBlob(destination);
    if (await sha256(copiedBlob) !== sourceHash) throw new Error(`Copy verification failed for ${row.assetId}`);
    const downloadUrl = await getDownloadURL(destination);
    await addDoc(collection(db, "creativeAssets"), {
      name: original.name, type: original.type, owner: original.owner, projectId: original.projectId,
      characterId: row.characterId, schemaVersion: 3, uploadedBy: user.uid,
      storagePath: row.destinationPath, downloadUrl, mimeType: original.mimeType,
      size: copiedBlob.size, migratedFromAssetId: original.id, sourceSha256: sourceHash,
      createdAt: serverTimestamp(),
    });
    copied++;
    onProgress(copied, candidates.length);
  }
  return { copied, skipped: preview.length - candidates.length };
}
