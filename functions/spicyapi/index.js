import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {initializeApp,getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {describeModel,listModels,estimateVideoCost,estimateImageCost} from "./models.js";

if(!getApps().length)initializeApp();
const secret=defineSecret("SPICYAPI_API_KEY");
const OWNER_UID="JZK1aIhqo5Zgl0oEbdCjhlko5qC3";
const ORIGIN="https://doppelgaenger-droid.github.io";

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
