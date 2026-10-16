// Curated catalog for Model Motion foundation. No external calls, no paid dispatch.
// Prices are indicative published base rates, not binding provider quotations.
const models=Object.freeze([
 {id:"alibaba/wan-3.0/reference-to-video",kind:"video",mode:"reference-to-video",maxImages:10,
  rates:{480:0.045,720:0.09,1080:0.18},minSeconds:2,maxSeconds:30},
 {id:"alibaba/wan-3.0-prime/reference-to-video",kind:"video",mode:"reference-to-video",maxImages:10,
  rates:{480:0.0612,720:0.126,1080:0.252},minSeconds:2,maxSeconds:30}
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
