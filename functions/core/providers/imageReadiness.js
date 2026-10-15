// Provider planning contract. This module never sends an outbound request or dispatches a job.
export const IMAGE_PROVIDERS=Object.freeze({
 sogni:Object.freeze({id:"sogni",workflowPath:"/v1/creative-agent/workflows",estimateOnly:true,defaultBillingMode:"subscription",subscriptionEligibleModels:"unverified-per-model",modelVerified:false,pricingVerified:false,referenceInputVerified:false,enabled:false}),
 artcraft:Object.freeze({id:"artcraft",imagePath:"/v1/omni_api/generate/image",modelVerified:false,pricingVerified:false,referenceInputVerified:false,enabled:false})
});
export function evaluateImageReadiness({provider,referenceCount,requestedBudgetUsd}={}){
 const config=IMAGE_PROVIDERS[provider];
 if(!config)return {ready:false,blockers:["UNKNOWN_PROVIDER"]};
 const blockers=[];
 if(!Number.isInteger(referenceCount)||referenceCount<1||referenceCount>30)blockers.push("INVALID_REFERENCE_COUNT");
 if(typeof requestedBudgetUsd!=="number"||!Number.isFinite(requestedBudgetUsd)||requestedBudgetUsd<=0||requestedBudgetUsd>100)blockers.push("INVALID_BUDGET");
 if(!config.modelVerified)blockers.push("MODEL_UNVERIFIED");
 if(!config.referenceInputVerified)blockers.push("REFERENCE_INPUT_UNVERIFIED");
 if(!config.pricingVerified)blockers.push("PRICING_UNVERIFIED");
 blockers.push("SERVER_BUDGET_RESERVATION_NOT_ACTIVE");
 return {provider,ready:false,dispatchEnabled:false,estimateOnly:config.estimateOnly===true,defaultBillingMode:config.defaultBillingMode??"tokens",blockers};
}
export function assertImageDispatchReady(){throw new Error("IMAGE_DISPATCH_DISABLED");}
