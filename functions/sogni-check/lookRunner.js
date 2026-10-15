import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {randomUUID} from "node:crypto";
const api="https://api.sogni.ai/v1/creative-agent/workflows";
const owner="JZK1aIhqo5Zgl0oEbdCjhlko5qC3";
const safeId=x=>typeof x==="string"&&/^[a-zA-Z0-9_-]{8,128}$/.test(x);
function result(status,body){return {status,body}}
async function sogni(url,key,options={}){
 const response=await fetch(url,{...options,headers:{"Authorization":"Bearer "+key,...options.headers},signal:AbortSignal.timeout(20000)});
 const json=await response.json().catch(()=>({}));
 return {ok:response.ok,status:response.status,data:json};
}
async function refs(db,uid,d){
 if(!d||d.ownerUid!==uid||d.status!=="draft"||d.provider&&d.provider!=="sogni"||d.billingMode&&d.billingMode!=="subscription"||typeof d.prompt!=="string"||d.prompt.trim().length<5||d.prompt.length>3000||!["strict","balanced","creative"].includes(d.integrity)||!Array.isArray(d.referenceAssetIds)||d.referenceAssetIds.length<1||d.referenceAssetIds.length>3||new Set(d.referenceAssetIds).size!==d.referenceAssetIds.length)return null;
 const images=await Promise.all(d.referenceAssetIds.map(id=>safeId(id)?db.collection("creativeAssets").doc(id).get():null));
 if(images.some(x=>!x?.exists))return null;
 if(images.some(x=>{const a=x.data();return a.uploadedBy!==uid||a.characterId!==d.characterId&&a.owner?.id!==d.characterId||typeof a.downloadUrl!=="string"||!a.downloadUrl.startsWith("https://firebasestorage.googleapis.com/")||!a.storagePath?.startsWith("model-motion/users/"+uid+"/")}))return null;
 return images.map(x=>x.data().downloadUrl);
}
function payload(d,urls){
 const instruction=d.integrity==="strict"?"Preserve the same recognizable face, bone structure, and identity from the supplied references.":d.integrity==="balanced"?"Keep the identity recognizable while changing the requested styling.":"Keep character identity recognizable while permitting creative styling.";
 return {input:{title:"Model Motion character look",steps:[{id:"image",toolName:"edit_image",arguments:{model:"krea-identity-edit",prompt:instruction+" "+d.prompt.trim(),sourceImageIndex:-1,referenceImageIndices:urls.map((_,i)=>-i-1)}}]},media_references:urls.map(url=>({kind:"image",url})),billing_mode:"subscription",token_type:"spark",confirm_cost:true,app_source:"model-motion"};
}
export async function runLookAction({path,body,uid,key,db=getFirestore(),bucket=getStorage().bucket("model-motion.firebasestorage.app")}){
 if(!body||typeof body!=="object"||Array.isArray(body))return result(400,{error:"INVALID_REQUEST"});
 if(path==="/looks/start"){
  const id=body.draftId;if(!safeId(id)||Object.keys(body).some(k=>k!=="draftId"))return result(400,{error:"INVALID_DRAFT_ID"});
  const draftSnap=await db.collection("characterLookDrafts").doc(id).get();if(!draftSnap.exists||draftSnap.data()?.ownerUid!==uid)return result(404,{error:"DRAFT_NOT_FOUND"});
  const d=draftSnap.data();const urls=await refs(db,uid,d);if(!urls)return result(422,{error:"INVALID_REFERENCES_OR_BILLING"});
  const jobRef=db.collection("characterLookJobs").doc(id);
  const reserved=await db.runTransaction(async tx=>{const s=await tx.get(jobRef);if(s.exists)return false;tx.create(jobRef,{ownerUid:uid,draftId:id,characterId:d.characterId,status:"starting",createdAt:new Date(),referenceAssetIds:d.referenceAssetIds,provider:"sogni",billingMode:"subscription"});return true});
  if(!reserved)return result(409,{error:"JOB_ALREADY_STARTED_OR_RESERVED",draftId:id});
  const response=await sogni(api,key,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":id},body:JSON.stringify(payload(d,urls))});
  if(!response.ok){await jobRef.update({status:"start_rejected",providerHttpStatus:response.status,updatedAt:new Date()});return result(502,{error:"SOGNI_REJECTED",providerHttpStatus:response.status,reason:response.data?.error||response.data?.message||"Check your Unlimited model eligibility."})}
  const workflowId=response.data?.data?.workflow?.workflowId;
  if(!safeId(workflowId)){await jobRef.update({status:"start_unknown",updatedAt:new Date()});return result(502,{error:"PROVIDER_RESPONSE_UNEXPECTED",draftId:id})}
  await jobRef.update({status:"queued",workflowId,updatedAt:new Date()});
  return result(202,{draftId:id,status:"queued",provider:"sogni",billingMode:"subscription"});
 }
 if(path==="/looks/status"){
  const id=body.draftId;if(!safeId(id)||Object.keys(body).some(k=>k!=="draftId"))return result(400,{error:"INVALID_DRAFT_ID"});
  const ref=db.collection("characterLookJobs").doc(id);const snap=await ref.get();
  if(!snap.exists||snap.data().ownerUid!==uid)return result(404,{error:"JOB_NOT_FOUND"});
  const job=snap.data();if(job.status==="saved")return result(200,{status:"saved",draftId:id,assetId:job.assetId});
  if(!safeId(job.workflowId))return result(200,{status:job.status,draftId:id});
  const response=await sogni(api+"/"+encodeURIComponent(job.workflowId),key);
  if(!response.ok)return result(502,{error:"SOGNI_STATUS_UNAVAILABLE"});
  const workflow=response.data?.data?.workflow;const status=workflow?.status;
  if(!["queued","running","completed","failed","partial_failure","cancelled","waiting_for_user"].includes(status))return result(502,{error:"UNKNOWN_PROVIDER_STATUS"});
  if(status!=="completed"){await ref.update({status,updatedAt:new Date()});return result(200,{status,draftId:id,waitingReason:workflow.waitingReason||null})}
  const artifact=workflow.steps?.[0]?.artifacts?.[0];
  const link=artifact?.url;if(typeof link!=="string"||!link.startsWith("https://"))return result(502,{error:"ARTIFACT_UNAVAILABLE"});
  // Avoid requesting arbitrary endpoints: only provider-issued HTTPS artifact hosts are accepted.
  const host=new URL(link).hostname;if(!/^(?:[a-z0-9-]+\.)*(?:sogni\.ai|sognistorage\.com|amazonaws\.com|cloudfront\.net)$/.test(host))return result(502,{error:"ARTIFACT_HOST_NOT_ALLOWED"});
  const img=await fetch(link,{signal:AbortSignal.timeout(20000),redirect:"error"});
  const mime=img.headers.get("content-type")?.split(";")[0]||"";
  if(!img.ok||!["image/jpeg","image/png","image/webp"].includes(mime)||Number(img.headers.get("content-length")||0)>25*1024*1024)return result(502,{error:"ARTIFACT_NOT_IMAGE"});
  const bytes=Buffer.from(await img.arrayBuffer());if(bytes.length>25*1024*1024)return result(413,{error:"ARTIFACT_TOO_LARGE"});
  const suffix=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";
  const storagePath="model-motion/users/"+uid+"/characters/"+job.characterId+"/generated-look/"+id+"."+suffix;
  const token=randomUUID();
  await bucket.file(storagePath).save(bytes,{resumable:false,metadata:{contentType:mime,metadata:{firebaseStorageDownloadTokens:token}}});
  const url="https://firebasestorage.googleapis.com/v0/b/"+bucket.name+"/o/"+encodeURIComponent(storagePath)+"?alt=media&token="+token;
  const draft=(await db.collection("characterLookDrafts").doc(id).get()).data();
  const assetRef=db.collection("creativeAssets").doc("look_"+id);
  await assetRef.set({name:"Generated look "+id,displayName:"Generated look",description:draft?.prompt||"",type:"generated-look",mediaType:"image",sourceType:"generated",generationPrompt:draft?.prompt||"",referenceAssetIds:job.referenceAssetIds,owner:{kind:"character",id:job.characterId,projectId:"character-library"},characterId:job.characterId,projectId:"character-library",uploadedBy:uid,storagePath,downloadUrl:url,mimeType:mime,size:bytes.length,schemaVersion:3,createdAt:new Date()},{merge:false});
  await ref.update({status:"saved",assetId:assetRef.id,updatedAt:new Date()});
  return result(200,{status:"saved",draftId:id,assetId:assetRef.id});
 }
 return result(404,{error:"UNKNOWN_ROUTE"});
}
