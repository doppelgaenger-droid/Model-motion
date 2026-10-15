import {collection,addDoc,getDocs,query,where,serverTimestamp} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import {listCreativeAssets,type AssetOwner} from "../assets/upload";
export type IntegrityMode="strict"|"balanced"|"creative";
export type LookDraft={id:string;characterId:string;prompt:string;integrity:IntegrityMode;referenceAssetIds:string[];status:"draft";ownerUid:string};
export async function createLookDraft(owner:Extract<AssetOwner,{kind:"character"}>,prompt:string,integrity:IntegrityMode,referenceAssetIds:string[]):Promise<LookDraft>{
 const user=auth.currentUser;if(!user)throw Error("Sign in first.");
 const clean=prompt.trim();if(clean.length<5||clean.length>3000)throw Error("Describe the look in 5–3000 characters.");
 const owned=await listCreativeAssets(owner);const allowed=new Set(owned.filter(a=>a.uploadedBy===user.uid).map(a=>a.id));
 const ids=[...new Set(referenceAssetIds)];if(!ids.length||ids.some(id=>!allowed.has(id)))throw Error("Select references belonging to this character.");
 const data={characterId:owner.id,prompt:clean,integrity,referenceAssetIds:ids,status:"draft" as const,ownerUid:user.uid,createdAt:serverTimestamp(),schemaVersion:1};
 const docRef=await addDoc(collection(db,"characterLookDrafts"),data);
 return {id:docRef.id,characterId:owner.id,prompt:clean,integrity,referenceAssetIds:ids,status:"draft",ownerUid:user.uid};
}
export async function listLookDrafts(characterId:string):Promise<LookDraft[]>{
 const user=auth.currentUser;if(!user)throw Error("Sign in first.");
 const docs=await getDocs(query(collection(db,"characterLookDrafts"),where("ownerUid","==",user.uid)));
 return docs.docs.map(x=>({id:x.id,...x.data()} as LookDraft)).filter(d=>d.characterId===characterId&&d.status==="draft");
}
