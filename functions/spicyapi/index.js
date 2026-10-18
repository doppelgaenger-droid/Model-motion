import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {initializeApp,getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {lookup} from "node:dns/promises";
import {connect} from "node:tls";
import {describeModel,listModels,estimateVideoCost,estimateImageCost} from "./models.js";

if(!getApps().length)initializeApp();
const secret=defineSecret("SPICYAPI_API_KEY");
const OWNER_UID="JZK1aIhqo5Zgl0oEbdCjhlko5qC3";
const ORIGIN="https://doppelgaenger-droid.github.io";

async function transportProbe(host){
 const results={host,dns:"unknown",tcpTls:"unknown",http:"unknown"};
 try{const addresses=await Promise.race([lookup(host,{all:true}),new Promise((_,reject)=>setTimeout(()=>reject(new Error("DNS_TIMEOUT")),5000))]);results.dns=addresses.length?"ok":"empty";results.addressFamilies=[...new Set(addresses.map(a=>a.family))]}catch(e){results.dns=e?.message==="DNS_TIMEOUT"?"timeout":e?.code==="ENOTFOUND"?"not-found":"failed"}
 if(results.dns!=="ok")return results;
 try{
  await new Promise((resolve,reject)=>{
   const socket=connect({host,port:443,servername:host,rejectUnauthorized:true,timeout:7000},()=>{results.tcpTls="ok";socket.end();resolve()});
   socket.once("timeout",()=>{socket.destroy();reject(new Error("TLS_TIMEOUT"))});
   socket.once("error",reject);
  });
 }catch(e){results.tcpTls=e?.message==="TLS_TIMEOUT"?"timeout":typeof e?.code==="string"&&["ECONNRESET","ECONNREFUSED","ENETUNREACH","ETIMEDOUT"].includes(e.code)?e.code:"failed"}
 if(results.tcpTls!=="ok")return results;
 try{
  const response=await fetch("https://"+host+"/api/v1/models",{redirect:"manual",signal:AbortSignal.timeout(7000)});
  results.http=response.status===401?"401-auth-required":response.status===403?"403-forbidden":response.status>=200&&response.status<500?"reachable":"server-error";
  await response.body?.cancel();
 }catch(e){results.http=e?.name==="TimeoutError"?"timeout":e?.cause?.code&&["ENOTFOUND","ECONNRESET","ETIMEDOUT"].includes(e.cause.code)?e.cause.code:"fetch-failed"}
 return results;
}

export const modelMotionSpicyEu=onRequest({
 region:"europe-west1",secrets:[secret],
 serviceAccount:"model-motion-runtime@model-motion.iam.gserviceaccount.com",
 cors:false,maxInstances:1,timeoutSeconds:30
},async(req,res)=>{
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Content-Type-Options","nosniff");
 res.setHeader("Vary","Origin");
 if(req.headers.origin===ORIGIN){
  res.setHeader("Access-Control-Allow-Origin",ORIGIN);
  res.setHeader("Access-Control-Allow-Headers","authorization,content-type");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
 }
 if(req.method==="OPTIONS")return res.status(req.headers.origin===ORIGIN?204:403).end();
 if(req.method!=="POST")return res.status(405).json({error:"METHOD_NOT_ALLOWED"});
 if(req.headers.origin&&req.headers.origin!==ORIGIN)return res.status(403).json({error:"ORIGIN_DENIED"});
 const token=/^Bearer (.+)$/.exec(String(req.headers.authorization??""))?.[1];
 if(!token)return res.status(401).json({error:"AUTH_REQUIRED"});
 try{const user=await getAuth().verifyIdToken(token,true);if(user.uid!==OWNER_UID)return res.status(403).json({error:"PRIVATE_ONLY"})}
 catch{return res.status(401).json({error:"AUTH_REQUIRED"})}
 const body=req.body&&typeof req.body==="object"&&!Array.isArray(req.body)?req.body:{};
 if(req.path==="/foundation/status")return res.status(200).json({
  provider:"spicyapi",region:"europe-west1",keyConfigured:Boolean(secret.value()?.trim()),
  generationEnabled:false,paidDispatchEnabled:false,readOnly:true,
  models:listModels()
 });
 if(req.path==="/foundation/transport-probe"){
  const checks=await Promise.all([transportProbe("api.spicyapi.ai"),transportProbe("www.google.com")]);
  return res.status(200).json({readOnly:true,generationEnabled:false,paidDispatchEnabled:false,checks});
 }
 if(req.path==="/foundation/live-catalog"){
  try{
   const rawSecret=secret.value();
   const apiKey=typeof rawSecret==="string"?rawSecret.trim():"";
   if(!apiKey)return res.status(503).json({error:"PROVIDER_KEY_EMPTY"});
   if(/[\\r\\n\\u0000-\\u001f\\u007f-\\u009f]/.test(apiKey)||!/^[\\x21-\\x7e]+$/.test(apiKey))return res.status(422).json({error:"PROVIDER_KEY_INVALID_FORMAT"});
   const headers=new Headers({Authorization:"Bearer "+apiKey,Accept:"application/json"});
   const response=await fetch("https://api.spicyapi.ai/api/v1/models",{headers,signal:AbortSignal.timeout(12000),redirect:"error"});
   if(!response.ok)return res.status(502).json({error:response.status===401?"PROVIDER_KEY_REJECTED":response.status===403?"PROVIDER_KEY_FORBIDDEN":"PROVIDER_CATALOG_HTTP_ERROR",providerHttpStatus:response.status});
   const responseText=await response.text();
   let result;try{result=JSON.parse(responseText)}catch{return res.status(502).json({error:"PROVIDER_NON_JSON_RESPONSE",providerHttpStatus:response.status})}
   if(result?.code!==200||!Array.isArray(result?.data?.items))return res.status(502).json({error:"INVALID_PROVIDER_RESPONSE",providerCode:typeof result?.code==="number"?result.code:null,providerMessageType:typeof result?.msg});
   const curated=listModels().map(m=>{const item=result.data.items.find(i=>i.model===m.id);return {id:m.id,found:!!item,enabled:item?.enabled===true,available:item?.available===true}});
   return res.status(200).json({credentialAccepted:true,curated,liveCount:result.data.items.length,generationEnabled:false,paidDispatchEnabled:false});
  }catch(error){
   const raw=String(error?.cause?.code??"");
   const known=["ENOTFOUND","EAI_AGAIN","ECONNREFUSED","ECONNRESET","ETIMEDOUT","ENETUNREACH","EHOSTUNREACH","UND_ERR_CONNECT_TIMEOUT","UND_ERR_HEADERS_TIMEOUT","CERT_HAS_EXPIRED","UNABLE_TO_VERIFY_LEAF_SIGNATURE","SELF_SIGNED_CERT_IN_CHAIN"];
   const transportCode=known.includes(raw)?raw:"OTHER";
   const reason=error?.name==="TimeoutError"?"PROVIDER_TIMEOUT":error?.name==="TypeError"?"PROVIDER_NETWORK_ERROR":"PROVIDER_REQUEST_EXCEPTION";
   console.warn("SpicyAPI catalog transport failure",{reason,transportCode,errorName:typeof error?.name==="string"?error.name:"unknown"});
   return res.status(502).json({error:reason,transportCode});
  }
 }
 if(req.path==="/foundation/estimate"){
  const model=describeModel(body.modelId);
  if(!model)return res.status(422).json({error:"UNKNOWN_MODEL"});
  const estimated=model.kind==="video"?estimateVideoCost(body):estimateImageCost(body);
  if(!estimated)return res.status(422).json({error:"INVALID_ESTIMATE_OPTIONS"});
  return res.status(200).json({provider:"spicyapi",modelId:model.id,previewOnly:true,
   dispatchReady:false,paidDispatchEnabled:false,referenceLimit:model.maxImages,estimate:estimated,
   note:"Planning estimate only; verify final provider charge before dispatch."
  });
 }
 return res.status(404).json({error:"UNKNOWN_ROUTE"});
});
