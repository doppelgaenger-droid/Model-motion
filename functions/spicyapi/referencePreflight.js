// Read-only reference verification; never returns paths or signed URLs.
const STORAGE_BUCKET="model-motion.firebasestorage.app";
export async function verifyOwnedReferences(db, storage, ownerUid, characterId, ids) {
 if (typeof characterId!=="string"||!/^[a-zA-Z0-9_-]{1,128}$/.test(characterId)) return {ok:false,error:"INVALID_CHARACTER_ID"};
 if (!Array.isArray(ids)||ids.length<1||ids.length>10) return {ok:false,error:"INVALID_REFERENCE_IDS"};
 try {
  const docs=await Promise.all(ids.map(id=>db.collection("creativeAssets").doc(id).get()));
  const paths=[];
  for (const doc of docs) {
   const asset=doc.data();
   if (!doc.exists||asset?.uploadedBy!==ownerUid||
       !(asset.characterId===characterId||(asset.owner?.kind==="character"&&asset.owner?.id===characterId))||
       typeof asset.storagePath!=="string"||
       !asset.storagePath.startsWith("model-motion/users/"+ownerUid+"/")||
       asset.storagePath.includes("..")||asset.storagePath.length>1024)
    return {ok:false,error:"REFERENCES_NOT_OWNED_OR_MISSING"};
   paths.push(asset.storagePath);
  }
  const results=await Promise.all(paths.map(path=>storage.bucket(STORAGE_BUCKET).file(path).exists()));
  if (results.some(([exists])=>!exists)) return {ok:false,error:"REFERENCES_NOT_OWNED_OR_MISSING"};
  return {ok:true,referenceValidation:"passed",referenceCount:paths.length,storageExists:true};
 } catch(error) {
  const code=typeof error?.code==="number"?error.code:typeof error?.code==="string"?error.code:"UNKNOWN";
  const known=code===7||code===403?"PERMISSION_DENIED":code===5||code===404?"NOT_FOUND":"OTHER";
  console.warn("SpicyAPI reference verification failed",{stage:"firestore-or-storage",category:known});
  return {ok:false,error:"REFERENCE_VERIFICATION_UNAVAILABLE",category:known};
 }
}
