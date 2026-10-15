import {preflightCharacterLook} from "../jobs/lookPreflight.js";
import {buildSogniLookPlan} from "./sogniEdit.js";
export async function inspectSogniLookPlan(db,uid,input){
 const checked=await preflightCharacterLook(db,uid,input);
 if(checked.status!==200)return checked;
 const record=await db.collection("characterLookDrafts").doc(input.draftId).get();
 const draft=record.data();
 if(draft.provider&&draft.provider!=="sogni")return {status:422,body:{error:"NOT_SOGNI_DRAFT"}};
 if(draft.billingMode&&draft.billingMode!=="subscription")return {status:422,body:{error:"TOKEN_MODE_NOT_ENABLED"}};
 if(draft.referenceAssetIds.length>3)return {status:422,body:{error:"MAX_THREE_REFERENCES_FOR_FIRST_ADAPTER"}};
 const images=await Promise.all(draft.referenceAssetIds.map(id=>db.collection("creativeAssets").doc(id).get()));
 const urls=images.map(x=>x.data()?.downloadUrl);
 try {
  const plan=buildSogniLookPlan({prompt:draft.prompt,integrity:draft.integrity,referenceUrls:urls});
  return {status:200,body:{draftId:input.draftId,provider:"sogni",model:plan.input.steps[0].arguments.model,toolName:"edit_image",billingMode:"subscription",referenceCount:urls.length,characterIntegrity:draft.integrity,previewOnly:true,dispatchReady:false,mediaUrlsRedacted:true,message:"Sogni reference-guided edit plan validated locally. Live provider request not sent."}};
 }catch(e){return {status:422,body:{error:e.message||"LOOK_PLAN_FAILED"}}}
}
