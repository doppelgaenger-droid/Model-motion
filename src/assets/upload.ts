import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, firebaseConfigurationError, storage } from "../lib/firebase";

export type AssetOwner =
  | { kind: "character"; id: string; projectId: string }
  | { kind: "project"; id: string; episodeId?: string };

export type CreativeAssetType = "character-board" | "identity-reference" | "full-body-reference" | "storyboard" | "location-reference" | "additional-reference" | "generated-look";

export interface UploadedCreativeAsset {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  mediaType?: "image" | "video";
  sourceType?: "core" | "uploaded" | "generated";
  generationPrompt?: string;
  referenceAssetIds?: string[];
  type: CreativeAssetType;
  owner: AssetOwner;
  projectId: string;
  schemaVersion?: number;
  characterId?: string;
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

  if (owner.kind === "character" && (!owner.projectId || typeof owner.projectId !== "string")) {
    throw new Error("Character project ID is missing. Reload the Models page and try again.");
  }
  const projectId = projectIdFor(owner);
  const episode = owner.kind === "project" && owner.episodeId ? `/episodes/${owner.episodeId}` : "";
  const storagePath = owner.kind === "character"
    ? `model-motion/users/${user.uid}/characters/${owner.id}/${type}/${Date.now()}-${safeName(file.name)}`
    : `model-motion/users/${user.uid}/projects/${projectId}/${owner.kind}s/${owner.id}${episode}/${type}/${Date.now()}-${safeName(file.name)}`;
  const objectRef = ref(storage, storagePath);
  await uploadBytes(objectRef, file, { contentType: file.type });

  let metadataWritten = false;
  try {
    const downloadUrl = await getDownloadURL(objectRef);
    const metadata = { schemaVersion:owner.kind === "character" ? 3 : 2, characterId:owner.kind === "character" ? owner.id : null, name:file.name, type, mediaType:"image", sourceType:owner.kind==="character"&&["identity-reference","character-board","full-body-reference"].includes(type)?"core":"uploaded", owner, projectId, uploadedBy:user.uid, storagePath, downloadUrl, mimeType:file.type, size:file.size, createdAt:serverTimestamp() };
    const document = await addDoc(collection(db, "creativeAssets"), metadata);
    metadataWritten = true;
    const persisted = await getDoc(document);
    if (!persisted.exists() || persisted.data().uploadedBy !== user.uid || persisted.data().storagePath !== storagePath) {
      throw new Error("Upload reached Storage but its Firestore metadata could not be verified. Check your connection and permissions.");
    }
    return { id:document.id, schemaVersion:metadata.schemaVersion, characterId:metadata.characterId ?? undefined, name:file.name, type, owner, projectId, uploadedBy:user.uid, storagePath, downloadUrl, mimeType:file.type, size:file.size };
  } catch (error) {
    // Keep the object when metadata was written but its readback failed.
    // Deleting it here would leave a broken Firestore record.
    if (!metadataWritten) await deleteObject(objectRef).catch(() => undefined);
    throw error;
  }
}

export async function listCreativeAssets(owner: AssetOwner): Promise<UploadedCreativeAsset[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const snapshot = await getDocs(query(collection(db, "creativeAssets"), where("uploadedBy", "==", user.uid)));
  return snapshot.docs
    .map(doc => ({ id:doc.id, ...doc.data() } as UploadedCreativeAsset))
    .filter(asset => {
      if (owner.kind === "character") {
        // Global character records use characterId. Legacy records remain readable
        // through their original project-scoped owner without copying or deleting files.
        if (asset.characterId === owner.id) return true;
        return asset.owner?.kind === "character" && asset.owner.id === owner.id && asset.projectId === owner.projectId;
      }
      return asset.projectId === owner.id && asset.owner?.kind === "project" && asset.owner.id === owner.id && asset.owner.episodeId === owner.episodeId;
    });
}

/** Update only user-owned asset labels; never rename Storage objects or alter ownership. */
export async function updateCreativeAssetMetadata(asset:UploadedCreativeAsset, owner:AssetOwner, displayName:string, description:string):Promise<{displayName:string;description:string}> {
 const user=auth.currentUser;
 if(!user || asset.uploadedBy!==user.uid)throw new Error("Not authorized to edit this image.");
 if(asset.owner?.kind!==owner.kind || asset.owner.id!==owner.id || (owner.kind==="project" && asset.projectId!==owner.id) || (owner.kind==="character" && asset.characterId!==owner.id && asset.projectId!==owner.projectId))throw new Error("Image ownership does not match the selected character.");
 const title=displayName.trim(), note=description.trim();
 if(!title || title.length>120)throw new Error("Title must be 1–120 characters.");
 if(note.length>1000)throw new Error("Description must be at most 1000 characters.");
 const document=doc(db,"creativeAssets",asset.id);
 const snapshot=await getDoc(document);
 if(!snapshot.exists() || snapshot.data().uploadedBy!==user.uid || snapshot.data().storagePath!==asset.storagePath)throw new Error("The image record could not be verified.");
 await updateDoc(document,{displayName:title,description:note,updatedAt:serverTimestamp()});
 return {displayName:title,description:note};
}

/** Delete only an asset belonging to the signed-in user and the active project. */
export async function deleteCreativeAsset(asset: UploadedCreativeAsset, owner: AssetOwner): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before deleting assets.");
  if (asset.uploadedBy !== user.uid || asset.owner?.kind !== owner.kind || asset.owner?.id !== owner.id ||
      (owner.kind === "project" && asset.projectId !== owner.id) ||
      (owner.kind === "character" && asset.characterId !== owner.id && asset.projectId !== owner.projectId)) {
    throw new Error("This asset does not belong to the selected project.");
  }
  const globalPrefix = `model-motion/users/${user.uid}/characters/${owner.id}/`;
  const legacyPrefix = `model-motion/users/${user.uid}/projects/${projectIdFor(owner)}/`;
  if (!(owner.kind === "character" && asset.characterId === owner.id && asset.storagePath.startsWith(globalPrefix)) &&
      !asset.storagePath.startsWith(legacyPrefix)) throw new Error("Invalid asset storage path.");
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
  "additional-reference":5,
  "generated-look":6,
};
export function sortCreativeAssets(assets:UploadedCreativeAsset[]):UploadedCreativeAsset[] {
  return [...assets].sort((a,b)=>assetTypeOrder[a.type]-assetTypeOrder[b.type] || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
