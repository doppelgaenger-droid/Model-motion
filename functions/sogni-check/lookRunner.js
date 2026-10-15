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

async function inspectReference(url){
 const parsed=new URL(url);
 if(parsed.protocol!=="https:"||parsed.hostname!=="firebasestorage.googleapis.com"||parsed.port||!parsed.pathname.startsWith("/v0/b/model-motion.firebasestorage.app/o/"))return {ok:false,reason:"UNTRUSTED_REFERENCE_URL"};
 try{
  const response=await fetch(url,{method:"GET",headers:{Range:"bytes=0-31"},redirect:"error",signal:AbortSignal.timeout(7000)});
  if(!response.ok){await response.body?.cancel();return {ok:false,reason:"REFERENCE_HTTP_ERROR",httpStatus:response.status}}
  const contentType=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  const reader=response.body?.getReader();
  if(!reader)return {ok:false,reason:"REFERENCE_EMPTY"};
  const chunk=await reader.read();
  await reader.cancel();
  const b=chunk.value||new Uint8Array();
  const png=b.length>=8&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10;
  const jpeg=b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
  const webp=b.length>=12&&String.fromCharCode(...b.slice(0,4))==="RIFF"&&String.fromCharCode(...b.slice(8,12))==="WEBP";
  const matches=(png&&contentType==="image/png")||(jpeg&&contentType==="image/jpeg")||(webp&&contentType==="image/webp");
  return {ok:matches,reason:matches?"OK":"INVALID_IMAGE_SIGNATURE_OR_TYPE",mimeType:contentType};
 }catch(error){return {ok:false,reason:error?.name==="TimeoutError"?"REFERENCE_TIMEOUT":"REFERENCE_DOWNLOAD_FAILED"}}
}

function payload(d,urls){
 const instruction=d.integrity==="strict"?"Preserve the same recognizable face, bone structure, and identity from the supplied references.":d.integrity==="balanced"?"Keep the identity recognizable while changing the requested styling.":"Keep character identity recognizable while permitting creative styling.";
 return {input:{title:"Model Motion character look",steps:[{id:"image",toolName:"edit_image",arguments:{model:"krea-identity-edit",prompt:instruction+" "+d.prompt.trim(),sourceImageIndex:-1,...(urls.length>1?{referenceImageIndices:urls.slice(1).map((_,i)=>-(i+2))}:{})}}]},media_references:urls.map(url=>({kind:"image",url})),billing_mode:"subscription",token_type:"spark",confirm_cost:true,safe_content_filter:d.allowMatureContent===true?false:true,app_source:"model-motion"};
}

function extractWorkflowFailure(workflow){
 const steps=Array.isArray(workflow?.steps)?workflow.steps:[];
 const failed=steps.find(s=>["failed","error","partial_failure"].includes(s?.status))||steps[steps.length-1]||{};
 const rawCode=failed.errorCode??failed.error?.code??workflow.errorCode??workflow.error?.code;
 const code=typeof rawCode==="string"&&/^[A-Za-z0-9_.-]{1,80}$/.test(rawCode)?rawCode:"PROVIDER_WORKFLOW_FAILED";
 const candidates=[failed.error?.message,failed.errorMessage,failed.failureReason,workflow.error?.message,workflow.errorMessage,workflow.failureReason];
 const message=candidates.find(v=>typeof v==="string"&&v.trim());
 // Provider messages may contain private prompts, URLs or signed credentials.
 // Keep detailed provider data in server logs, return only a safe categorical code.
 const detail=message?"Sogni returned a failure for the image-edit step. Check the provider workflow for details.":"Sogni did not provide a structured failure reason in the workflow snapshot.";
 return {code,detail,stepStatus:typeof failed.status==="string"?failed.status:"unknown"};
}

export async function runLookAction({path,body,uid,key,db=getFirestore(),bucket=null}){
 let stage="validate_request";
 try {
 if(!body||typeof body!=="object"||Array.isArray(body))return result(400,{error:"INVALID_REQUEST"});
 if(path==="/looks/reference-preflight"){
  const id=body.draftId;if(!safeId(id)||Object.keys(body).some(k=>k!=="draftId"))return result(400,{error:"INVALID_DRAFT_ID"});
  stage="read_draft";const doc=await db.collection("characterLookDrafts").doc(id).get();
  if(!doc.exists||doc.data()?.ownerUid!==uid)return result(404,{error:"DRAFT_NOT_FOUND"});
  stage="read_references";const urls=await refs(db,uid,doc.data());
  if(!urls)return result(422,{error:"INVALID_REFERENCES_OR_BILLING"});
  stage="check_reference_urls";const images=await Promise.all(urls.map((url,index)=>inspectReference(url).then(check=>({index:index+1,...check}))));
  return result(200,{status:images.every(i=>i.ok)?"passed":"failed",referenceCount:images.length,images,providerCalled:false,generationStarted:false});
 }
 if(path==="/looks/start"){
  const id=body.draftId;if(!safeId(id)||Object.keys(body).some(k=>k!=="draftId"))return result(400,{error:"INVALID_DRAFT_ID"});
  stage="read_draft";
  const draftSnap=await db.collection("characterLookDrafts").doc(id).get();if(!draftSnap.exists||draftSnap.data()?.ownerUid!==uid)return result(404,{error:"DRAFT_NOT_FOUND"});
  stage="read_references";
  const d=draftSnap.data();const urls=await refs(db,uid,d);if(!urls)return result(422,{error:"INVALID_REFERENCES_OR_BILLING"});
  const jobRef=db.collection("characterLookJobs").doc(id);
  stage="reserve_job";
  const reserved=await db.runTransaction(async tx=>{const s=await tx.get(jobRef);if(s.exists)return false;tx.create(jobRef,{ownerUid:uid,draftId:id,characterId:d.characterId,status:"starting",createdAt:new Date(),referenceAssetIds:d.referenceAssetIds,provider:"sogni",billingMode:"subscription"});return true});
  if(!reserved)return result(409,{error:"JOB_ALREADY_STARTED_OR_RESERVED",draftId:id});
  stage="sogni_submit";
  const response=await sogni(api,key,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":id},body:JSON.stringify(payload(d,urls))});
  if(!response.ok){await jobRef.update({status:"start_rejected",providerHttpStatus:response.status,updatedAt:new Date()});return result(502,{error:"SOGNI_REJECTED",providerHttpStatus:response.status,reason:response.data?.error||response.data?.message||"Check your Unlimited model eligibility."})}
  const workflowId=response.data?.data?.workflow?.workflowId;
  if(!safeId(workflowId)){await jobRef.update({status:"start_unknown",updatedAt:new Date()});return result(502,{error:"PROVIDER_RESPONSE_UNEXPECTED",draftId:id})}
  stage="store_workflow";
  await jobRef.update({status:"queued",workflowId,updatedAt:new Date()});
  return result(202,{draftId:id,status:"queued",provider:"sogni",billingMode:"subscription"});
 }
 if(path==="/looks/status"){
  const id=body.draftId;if(!safeId(id)||Object.keys(body).some(k=>k!=="draftId"))return result(400,{error:"INVALID_DRAFT_ID"});
  stage="read_job";
  const ref=db.collection("characterLookJobs").doc(id);const snap=await ref.get();
  if(!snap.exists||snap.data().ownerUid!==uid)return result(404,{error:"JOB_NOT_FOUND"});
  const job=snap.data();if(job.status==="saved")return result(200,{status:"saved",draftId:id,assetId:job.assetId});
  if(!safeId(job.workflowId))return result(200,{status:job.status,draftId:id});
  stage="sogni_status";
  const response=await sogni(api+"/"+encodeURIComponent(job.workflowId),key);
  if(!response.ok)return result(502,{error:"SOGNI_STATUS_UNAVAILABLE"});
  const workflow=response.data?.data?.workflow;const status=workflow?.status;
  if(!["queued","running","completed","failed","partial_failure","cancelled","waiting_for_user"].includes(status))return result(502,{error:"UNKNOWN_PROVIDER_STATUS"});
  if(status!=="completed"){
   const terminal=["failed","partial_failure","cancelled"].includes(status);
   let failure=terminal?extractWorkflowFailure(workflow):null;
   if(terminal){
    try {
     const log=await sogni(api+"/"+encodeURIComponent(job.workflowId)+"/events",key);
     if(log.ok){
      const data=log.data?.data??log.data;
      const events=Array.isArray(data)?data:Array.isArray(data?.events)?data.events:[];
      const failedEvents=events.filter(e=>["step_failed","workflow_failed"].includes(e?.type??e?.eventType??e?.event));
      const latest=failedEvents[failedEvents.length-1];
      if(latest){
       const eventDetails=latest.data??latest.payload??latest;
       const eventCode=eventDetails?.errorCode??eventDetails?.code??eventDetails?.error?.code??eventDetails?.errorType;
       const eventMessage=eventDetails?.error?.message??eventDetails?.message??eventDetails?.reason;
       const code=typeof eventCode==="string"&&/^[A-Za-z0-9_.-]{1,80}$/.test(eventCode)?eventCode:failure.code;
       // Do not disclose raw event payload: provider may include prompts or private media URLs.
       const category=typeof eventMessage==="string"?
        (/quota|credit|subscription|plan|billing/i.test(eventMessage)?"BILLING_OR_PLAN":
        /model|unsupported|invalid.argument/i.test(eventMessage)?"MODEL_OR_ARGUMENT":
        /media|image|reference|download|url/i.test(eventMessage)?"REFERENCE_MEDIA":
        /safety|content|policy/i.test(eventMessage)?"CONTENT_POLICY":"PROVIDER_STEP_FAILURE"):"PROVIDER_STEP_FAILURE";
       failure={code,detail:"Sogni failure event category: "+category+".",stepStatus:failure.stepStatus,eventType:latest.type??latest.eventType??latest.event};
      }
     }else console.warn("Sogni event log unavailable",{workflowId:job.workflowId,httpStatus:log.status});
    }catch(error){console.warn("Sogni event log fetch failed",{workflowId:job.workflowId,reason:error instanceof Error?error.name:"unknown"});}
   }
   await ref.update({status,updatedAt:new Date(),...(failure?{failureCode:failure.code,failureDetail:failure.detail}:{})});
   return result(200,{status,draftId:id,waitingReason:workflow.waitingReason||null,...(failure?{failure}:{})});
  }
  const artifact=workflow.steps?.[0]?.artifacts?.[0];
  const link=artifact?.url;if(typeof link!=="string"||!link.startsWith("https://"))return result(502,{error:"ARTIFACT_UNAVAILABLE"});
  // Avoid requesting arbitrary endpoints: only provider-issued HTTPS artifact hosts are accepted.
  const host=new URL(link).hostname;if(!/^(?:[a-z0-9-]+\.)*(?:sogni\.ai|sognistorage\.com|amazonaws\.com|cloudfront\.net|storage\.googleapis\.com)$/.test(host))return result(502,{error:"ARTIFACT_HOST_NOT_ALLOWED"});
  stage="download_artifact";
  const img=await fetch(link,{signal:AbortSignal.timeout(20000),redirect:"error"});
  const mime=img.headers.get("content-type")?.split(";")[0]||"";
  if(!img.ok||!["image/jpeg","image/png","image/webp"].includes(mime)||Number(img.headers.get("content-length")||0)>25*1024*1024)return result(502,{error:"ARTIFACT_NOT_IMAGE"});
  const bytes=Buffer.from(await img.arrayBuffer());if(bytes.length>25*1024*1024)return result(413,{error:"ARTIFACT_TOO_LARGE"});
  const suffix=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";
  const storagePath="model-motion/users/"+uid+"/characters/"+job.characterId+"/generated-look/"+id+"."+suffix;
  const token=randomUUID();
  stage="save_storage";
  const targetBucket=bucket??getStorage().bucket("model-motion.firebasestorage.app");
  await targetBucket.file(storagePath).save(bytes,{resumable:false,metadata:{contentType:mime,metadata:{firebaseStorageDownloadTokens:token}}});
  const url="https://firebasestorage.googleapis.com/v0/b/"+targetBucket.name+"/o/"+encodeURIComponent(storagePath)+"?alt=media&token="+token;
  const draft=(await db.collection("characterLookDrafts").doc(id).get()).data();
  const assetRef=db.collection("creativeAssets").doc("look_"+id);
  stage="save_asset_metadata";
  await assetRef.set({name:"Generated look "+id,displayName:"Generated look",description:draft?.prompt||"",type:"generated-look",mediaType:"image",sourceType:"generated",generationPrompt:draft?.prompt||"",referenceAssetIds:job.referenceAssetIds,owner:{kind:"character",id:job.characterId,projectId:"character-library"},characterId:job.characterId,projectId:"character-library",uploadedBy:uid,storagePath,downloadUrl:url,mimeType:mime,size:bytes.length,schemaVersion:3,createdAt:new Date()},{merge:false});
  stage="mark_saved";
  await ref.update({status:"saved",assetId:assetRef.id,updatedAt:new Date()});
  return result(200,{status:"saved",draftId:id,assetId:assetRef.id});
 }
 return result(404,{error:"UNKNOWN_ROUTE"});
 } catch(error) {
  if(error && typeof error==="object")error.runnerStage=stage;
  throw error;
 }
}
