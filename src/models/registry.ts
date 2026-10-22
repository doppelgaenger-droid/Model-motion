import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type CustomModel = { id:string; name:string; description:string; projectId:string; ownerUid:string };
const collectionRef = () => collection(db,"characterRegistry");

export async function listCustomModels():Promise<CustomModel[]> {
  const user=auth.currentUser;
  if (!user) throw new Error("Sign in to access your models.");
  const docs=await getDocs(query(collectionRef(),where("ownerUid","==",user.uid)));
  return docs.docs.map(snapshot=>({id:snapshot.id,...snapshot.data(),projectId:"character-library"} as CustomModel))
    .filter(model=>model.ownerUid===user.uid && typeof model.name==="string")
    .sort((a,b)=>a.name.localeCompare(b.name));
}

export async function createCustomModel(name:string,description:string):Promise<CustomModel> {
  const user=auth.currentUser;
  if (!user) throw new Error("Sign in before creating a model.");
  const cleanName=name.trim().replace(/\s+/g," ");
  if (cleanName.length<2 || cleanName.length>80) throw new Error("The model name must be 2–80 characters.");
  const cleanDescription=description.trim();
  if (cleanDescription.length>1000) throw new Error("Description must be at most 1000 characters.");
  const payload={name:cleanName,description:cleanDescription,ownerUid:user.uid,createdAt:serverTimestamp(),schemaVersion:1};
  const created=await addDoc(collectionRef(),payload);
  return {id:created.id,name:cleanName,description:cleanDescription,ownerUid:user.uid,projectId:"character-library"};
}

/** Character IDs are stable. Rename only the display name, never assets or Storage paths. */
export async function renameCustomModel(id:string, name:string):Promise<void> {
  const user=auth.currentUser;
  if(!user)throw new Error("Sign in to rename a character.");
  const clean=name.trim().replace(/\s+/g," ");
  if(clean.length<2||clean.length>80)throw new Error("Name must be 2–80 characters.");
  const ref=doc(db,"characterRegistry",id);
  const existing=await getDoc(ref);
  if(!existing.exists()||existing.data().ownerUid!==user.uid)throw new Error("Character not found or access denied.");
  const all=await listCustomModels();
  if(all.some(m=>m.id!==id&&m.name.toLocaleLowerCase()===clean.toLocaleLowerCase()))throw new Error("A character with that name already exists.");
  await updateDoc(ref,{name:clean,updatedAt:serverTimestamp()});
}

/** Conservative deletion: never silently orphan assets, looks or productions.
 * Characters with dependencies must be cleared through dedicated asset/production flows first.
 */
export async function deleteEmptyCustomModel(id:string,confirmation:string):Promise<void> {
  const user=auth.currentUser;
  if(!user)throw new Error("Sign in to delete a character.");
  const ref=doc(db,"characterRegistry",id);
  const existing=await getDoc(ref);
  if(!existing.exists()||existing.data().ownerUid!==user.uid)throw new Error("Character not found or access denied.");
  const currentName=existing.data().name;
  if(typeof currentName!=="string"||confirmation!==currentName)throw new Error("Type the exact character name to confirm deletion.");
  const characterId="character-"+id;
  // Check all user-owned records in related collections, including legacy owner shapes.
  for(const collectionName of ["creativeAssets","productions","characterLookDrafts","characterLookJobs","modelMotionCoreJobs","privateSceneSnapshots","characterProfiles"]){
    const field=collectionName==="creativeAssets"?"uploadedBy":"ownerUid";
    const records=await getDocs(query(collection(db,collectionName),where(field,"==",user.uid)));
    if(records.docs.some(item=>{
      const data=item.data();
      return data.characterId===characterId||data.characterId===id||
        data.owner?.id===characterId||data.owner?.id===id||
        data.characterIds?.includes?.(characterId)||data.characterIds?.includes?.(id)||
        JSON.stringify(data).includes(characterId);
    }))throw new Error("This character has linked assets, looks or productions. Remove or unlink them first; no data was deleted.");
  }
  await deleteDoc(ref);
}
