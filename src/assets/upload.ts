import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, firebaseConfigurationError, storage } from "../lib/firebase";

export type AssetOwner =
  | { kind: "character"; id: string }
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
function projectIdFor(owner: AssetOwner) { return owner.kind === "project" ? owner.id : "room-714"; }

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
    const metadata = { name:file.name, type, owner, projectId, uploadedBy:user.uid, storagePath, downloadUrl, mimeType:file.type, size:file.size, createdAt:serverTimestamp() };
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
    .filter(asset => asset.owner?.kind === owner.kind && asset.owner?.id === owner.id && (owner.kind !== "project" || (asset.owner.kind === "project" && asset.owner.episodeId === owner.episodeId)));
}
