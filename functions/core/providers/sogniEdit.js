// Draft-only Sogni edit-image request builder. Deliberately never invokes Sogni.
const allowedModels=new Set(["krea-identity-edit","dark-beast-krea2-identity-edit","qwen"]);
export function buildSogniLookPlan({prompt,integrity,referenceUrls,model="krea-identity-edit",billingMode="subscription"}){
 if(!allowedModels.has(model))throw Error("UNVERIFIED_MODEL");
 if(billingMode!=="subscription")throw Error("TOKEN_BILLING_REQUIRES_SEPARATE_APPROVAL");
 if(typeof prompt!=="string"||prompt.trim().length<5||prompt.length>3000)throw Error("INVALID_PROMPT");
 if(!["strict","balanced","creative"].includes(integrity))throw Error("INVALID_INTEGRITY");
 if(!Array.isArray(referenceUrls)||referenceUrls.length<1||referenceUrls.length>3||referenceUrls.some(u=>typeof u!=="string"||!u.startsWith("https://")))throw Error("INVALID_REFERENCES");
 const integrityInstruction={strict:"Preserve the exact recognizable character identity, facial structure and proportions of the supplied references. Only change requested styling.",balanced:"Preserve the recognizable character identity while allowing requested clothing, hair and pose adjustments.",creative:"Keep the character recognizable while allowing broader styling variation."}[integrity];
 return {input:{title:"Model Motion · character look",steps:[{id:"look",toolName:"edit_image",arguments:{prompt:integrityInstruction+" "+prompt.trim(),model,sourceImageIndex:-1,referenceImageIndices:referenceUrls.map((_,i)=>-(i+1))}}]},media_references:referenceUrls.map(url=>({kind:"image",url})),billing_mode:"subscription",token_type:"auto",confirm_cost:false,app_source:"model-motion"};
}
export function enforceSogniNoDispatch(){throw Error("SOGNI_DISPATCH_AWAITING_VERIFIED_PRICING_AND_MEDIA_STORAGE");}
