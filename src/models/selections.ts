import {doc,getDoc,serverTimestamp,setDoc} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import {listCreativeAssets,type AssetOwner,type UploadedCreativeAsset} from "../assets/upload";
export type CharacterSelections={dashboardAssetId:string|null;defaultProductionAssetId:string|null};
const empty:CharacterSelections={dashboardAssetId:null,defaultProductionAssetId:null};
export async function readCharacterSelections(characterId:string):Promise<CharacterSelections>{
 const user=auth.currentUser;if(!user)throw Error("Sign in to load character selections.");
 const snapshot=await getDoc(doc(db,"characterProfiles",user.uid,"characters",characterId));
 if(!snapshot.exists())return {...empty};
 const data=snapshot.data();if(data.ownerUid!==user.uid||data.characterId!==characterId)throw Error("Invalid character profile ownership.");
 return {dashboardAssetId:typeof data.dashboardAssetId==="string"?data.dashboardAssetId:null,defaultProductionAssetId:typeof data.defaultProductionAssetId==="string"?data.defaultProductionAssetId:null};
}
export async function setCharacterSelection(owner:Extract<AssetOwner,{kind:"character"}>,role:keyof CharacterSelections,asset:UploadedCreativeAsset):Promise<CharacterSelections>{
 const user=auth.currentUser;if(!user)throw Error("Sign in first.");
 if(role!=="dashboardAssetId"&&role!=="defaultProductionAssetId")throw Error("Unknown selection.");
 const assets=await listCreativeAssets(owner);
 if(!assets.some(a=>a.id===asset.id&&a.uploadedBy===user.uid&&a.owner?.kind==="character"&&a.owner.id===owner.id))throw Error("Selected image does not belong to this character.");
 const path=doc(db,"characterProfiles",user.uid,"characters",owner.id);
 await setDoc(path,{ownerUid:user.uid,characterId:owner.id,[role]:asset.id,updatedAt:serverTimestamp()},{merge:true});
 return readCharacterSelections(owner.id);
}
export function resolveCharacterAsset(assets:UploadedCreativeAsset[],selectedId:string|null|undefined):UploadedCreativeAsset|undefined{
 return assets.find(a=>a.id===selectedId)||assets.find(a=>a.type==="identity-reference")||assets[0];
}
