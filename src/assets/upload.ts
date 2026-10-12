import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, firebaseConfigurationError, storage } from "../lib/firebase";

export type AssetOwner =
  | { kind: "character"; id: string; projectId: string }
  | { kind: "project"; id: string; episodeId?: string };

export type CreativeAssetType = "character-board" | "identity-reference" | "full-body-reference" | "storyboard" | "location-reference";

export interface UploadedCreativeAsset {
  id: string;
  name: string;
  type: CreativeAssetType;
  owner: AssetOwner;
  projectId: string;
  uploadedBy: string;
  storagePath: string;
  downloadUrl: string;
  mimeType: string;
  size: number;
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}
function projectIdFor(owner: AssetOwner) { return owner.kind === "project" ? owner.id : owner.projectId; }

export async function uploadCreativeAsset(file: File, owner: AssetOwner, type: CreativeAssetType): Promise<UploadedCreativeAsset> {
  if (!storage || !db) throw new Error(firebaseConfigurationError ?? "Firebase is not configured");
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before uploading assets.");
  if (!file.type.startsWith("image/")) throw new Error("Only image assets are supported in this first upload flow.");
  if (file.size >= 25 * 1024 * 1024) throw new Error("Images must be smaller than 25 MB.");

  const projectId = projectIdFor(owner);
  const episode = owner.kind === "project" && owner.episodeId ? `/episodes/${owner.episodeId}` : "";
  const storagePath = `model-motion/users/${user.uid}/projects/${projectId}/${owner.kind}s/${owner.id}${episode}/${type}/${Date.now()}-${safeName(file.name)}`;
  const objectRef = ref(storage, storagePath);
  await uploadBytes(objectRef, file, { contentType: file.type });

  try {
    const downloadUrl = await getDownloadURL(objectRef);
    const metadata = { schemaVersion:2, name:file.name, type, owner, projectId, uploadedBy:user.uid, storagePath, downloadUrl, mimeType:file.type, size:file.size, createdAt:serverTimestamp() };
    const document = await addDoc(collection(db, "creativeAssets"), metadata);
    return { id:document.id, name:file.name, type, owner, projectId, uploadedBy:user.uid, storagePath, downloadUrl, mimeType:file.type, size:file.size };
  } catch (error) {
    await deleteObject(objectRef).catch(() => undefined);
    throw error;
  }
}

export async function listCreativeAssets(owner: AssetOwner): Promise<UploadedCreativeAsset[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const snapshot = await getDocs(query(collection(db, "creativeAssets"), where("uploadedBy", "==", user.uid)));
  return snapshot.docs
    .map(doc => ({ id:doc.id, ...doc.data() } as UploadedCreativeAsset))
    .filter(asset => asset.projectId === projectIdFor(owner) && asset.owner?.kind === owner.kind && asset.owner?.id === owner.id && (owner.kind !== "project" || (asset.owner.kind === "project" && asset.owner.episodeId === owner.episodeId)));
}

/** Delete only an asset belonging to the signed-in user and the active project. */
export async function deleteCreativeAsset(asset: UploadedCreativeAsset, owner: AssetOwner): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before deleting assets.");
  if (asset.uploadedBy !== user.uid || asset.projectId !== projectIdFor(owner) ||
      asset.owner?.kind !== owner.kind || asset.owner?.id !== owner.id) {
    throw new Error("This asset does not belong to the selected project.");
  }
  const expectedPrefix = `model-motion/users/${user.uid}/projects/${projectIdFor(owner)}/`;
  if (!asset.storagePath.startsWith(expectedPrefix)) throw new Error("Invalid asset storage path.");
  // Keep the Firestore record when Storage deletion fails, so the user can retry.
  await deleteObject(ref(storage, asset.storagePath));
  await deleteDoc(doc(db, "creativeAssets", asset.id));
}

/** Stable visual order for character reference slots, regardless of upload time. */
const assetTypeOrder: Record<CreativeAssetType,number> = {
  "identity-reference":0,
  "character-board":1,
  "full-body-reference":2,
  "storyboard":3,
  "location-reference":4,
};
export function sortCreativeAssets(assets:UploadedCreativeAsset[]):UploadedCreativeAsset[] {
  return [...assets].sort((a,b)=>assetTypeOrder[a.type]-assetTypeOrder[b.type] || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
