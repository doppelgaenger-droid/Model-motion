import {collection,addDoc,getDocs,query,where,serverTimestamp} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import {listCreativeAssets,type AssetOwner} from "../assets/upload";
export type LookProvider="sogni"|"artcraft";
export type IntegrityMode="strict"|"balanced"|"creative";
export type LookDraft={id:string;characterId:string;prompt:string;integrity:IntegrityMode;referenceAssetIds:string[];status:"draft";ownerUid:string;provider?:LookProvider;billingMode?:"subscription"|"tokens";requestedBudgetUsd?:number;allowMatureContent?:boolean};
export async function createLookDraft(owner:Extract<AssetOwner,{kind:"character"}>,prompt:string,integrity:IntegrityMode,referenceAssetIds:string[],provider:LookProvider="sogni",billingMode:"subscription"|"tokens"="subscription",requestedBudgetUsd=0.5,allowMatureContent=false):Promise<LookDraft>{
 const user=auth.currentUser;if(!user)throw Error("Sign in first.");
 const clean=prompt.trim();if(clean.length<5||clean.length>3000)throw Error("Describe the look in 5–3000 characters.");
 const owned=await listCreativeAssets(owner);const allowed=new Set(owned.filter(a=>a.uploadedBy===user.uid).map(a=>a.id));
 if(provider==="sogni"&&referenceAssetIds.length>3)throw Error("Sogni pilot supports up to three selected references.");
 const ids=[...new Set(referenceAssetIds)];if(!ids.length||ids.some(id=>!allowed.has(id)))throw Error("Select references belonging to this character.");
 if(!["sogni","artcraft"].includes(provider))throw Error("Unknown image provider.");
 if(!Number.isFinite(requestedBudgetUsd)||requestedBudgetUsd<=0||requestedBudgetUsd>100)throw Error("Budget must be between $0.01 and $100.");
 if(provider==="artcraft"&&billingMode==="subscription")throw Error("Artcraft does not use the Sogni subscription.");
 const data={provider,billingMode,requestedBudgetUsd,allowMatureContent:provider==="sogni"&&allowMatureContent,characterId:owner.id,prompt:clean,integrity,referenceAssetIds:ids,status:"draft" as const,ownerUid:user.uid,createdAt:serverTimestamp(),schemaVersion:1};
 const docRef=await addDoc(collection(db,"characterLookDrafts"),data);
 return {id:docRef.id,provider,billingMode,requestedBudgetUsd,allowMatureContent:provider==="sogni"&&allowMatureContent,characterId:owner.id,prompt:clean,integrity,referenceAssetIds:ids,status:"draft",ownerUid:user.uid};
}
export async function listLookDrafts(characterId:string):Promise<LookDraft[]>{
 const user=auth.currentUser;if(!user)throw Error("Sign in first.");
 const docs=await getDocs(query(collection(db,"characterLookDrafts"),where("ownerUid","==",user.uid)));
 return docs.docs.map(x=>({id:x.id,...x.data()} as LookDraft)).filter(d=>d.characterId===characterId&&d.status==="draft");
}
