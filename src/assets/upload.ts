import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, firebaseConfigurationError, storage } from "../lib/firebase";

export type AssetOwner =
  | { kind: "character"; id: string }
  | { kind: "project"; id: string; episodeId?: string };

export type CreativeAssetType = "character-board" | "identity-reference" | "full-body-reference" | "storyboard" | "location-reference";

export interface UploadedCreativeAsset {
  id: string;
  name: string;
  type: CreativeAssetType;
  owner: AssetOwner;
  storagePath: string;
  downloadUrl: string;
  mimeType: string;
  size: number;
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function uploadCreativeAsset(file: File, owner: AssetOwner, type: CreativeAssetType): Promise<UploadedCreativeAsset> {
  if (!storage || !db) throw new Error(firebaseConfigurationError ?? "Firebase is not configured");
  if (!file.type.startsWith("image/")) throw new Error("Only image assets are supported in this first upload flow.");

  const episode = owner.kind === "project" && owner.episodeId ? `/episodes/${owner.episodeId}` : "";
  const storagePath = `model-motion/${owner.kind}s/${owner.id}${episode}/${type}/${Date.now()}-${safeName(file.name)}`;
  const objectRef = ref(storage, storagePath);
  await uploadBytes(objectRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(objectRef);

  const metadata = {
    name: file.name,
    type,
    owner,
    storagePath,
    downloadUrl,
    mimeType: file.type,
    size: file.size,
    createdAt: serverTimestamp(),
  };
  const document = await addDoc(collection(db, "creativeAssets"), metadata);
  return { id: document.id, ...metadata, createdAt: undefined } as unknown as UploadedCreativeAsset;
}
