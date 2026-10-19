// Curated catalog for Model Motion foundation. No external calls, no paid dispatch.
// Prices are indicative published base rates, not binding provider quotations.
const models=Object.freeze([
 {id:"alibaba/wan-3.0/reference-to-video",kind:"video",mode:"reference-to-video",maxImages:10,
  rates:{480:0.045,720:0.09,1080:0.18},minSeconds:2,maxSeconds:30},
 {id:"alibaba/wan-3.0-prime/reference-to-video",kind:"video",mode:"reference-to-video",maxImages:10,
  rates:{480:0.0612,720:0.126,1080:0.252},minSeconds:2,maxSeconds:30},
 {id:"alibaba/qwen-image-spicy-edit/edit",kind:"image",mode:"image-edit",maxImages:1,pricePerImageUsd:0.038},
 {id:"bytedance/seedream-5.0-pro/edit",kind:"image",mode:"image-edit",maxImages:10,prices:{ "1k":0.036, "2k":0.072}}
]);
export function listModels(){return models.map(m=>({...m, rates:{...m.rates}}))}
export function describeModel(id){return models.find(m=>m.id===id)||null}
export function estimateVideoCost({modelId,durationSeconds,resolution}={}){
 const model=describeModel(modelId);
 if(!model||model.kind!=="video"||!Number.isInteger(durationSeconds)||durationSeconds<model.minSeconds||durationSeconds>model.maxSeconds)return null;
 if(![480,720,1080].includes(resolution))return null;
 const rate=model.rates[resolution];if(!Number.isFinite(rate))return null;
 return {currency:"USD",unit:"seconds",durationSeconds,resolution,baseUsd:Number((rate*durationSeconds).toFixed(4)),includesExtras:false};
}

export function estimateImageCost({modelId,resolution="1k",imageCount=1}={}){
 const model=describeModel(modelId);
 if(!model||model.kind!=="image"||imageCount!==1)return null;
 const rate=model.prices?.[resolution]??model.pricePerImageUsd;
 if(!Number.isFinite(rate))return null;
 return {currency:"USD",unit:"image",imageCount:1,resolution:model.prices?resolution:"fixed",baseUsd:rate,includesExtras:false};
}

const SUPPORTED_REFERENCE_ID=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
export function planGeneration(input={}){
 const model=describeModel(input.modelId);
 if(!model)return {ok:false,error:"UNKNOWN_MODEL"};
 const refs=input.referenceAssetIds;
 if(!Array.isArray(refs)||refs.length<1||refs.length>model.maxImages||refs.some(v=>typeof v!=="string"||!SUPPORTED_REFERENCE_ID.test(v))||new Set(refs).size!==refs.length)
  return {ok:false,error:"INVALID_REFERENCE_IDS"};
 if(typeof input.prompt!=="string"||!input.prompt.trim()||input.prompt.length>2500)
  return {ok:false,error:"INVALID_PROMPT"};
 const estimate=model.kind==="video"?estimateVideoCost(input):estimateImageCost(input);
 if(!estimate)return {ok:false,error:"INVALID_ESTIMATE_OPTIONS"};
 const budget=input.maxBudgetUsd;
 if(typeof budget!=="number"||!Number.isFinite(budget)||budget<=0||budget>0.5)
  return {ok:false,error:"INVALID_BUDGET"};
 if(estimate.baseUsd>budget)return {ok:false,error:"BUDGET_EXCEEDED",estimate};
 return {ok:true,plan:{modelId:model.id,kind:model.kind,referenceAssetIds:[...refs],
  referenceCount:refs.length,promptLength:input.prompt.trim().length,
  estimate,maxBudgetUsd:budget,requiresReferenceOwnershipCheck:true,
  referencesResolved:false,dispatchReady:false,paidDispatchEnabled:false,generationEnabled:false,
  storageReady:false,persistenceReady:false,
  note:"Dry-run only. Reference ownership and provider parameters must be verified before any dispatch."}};
}
