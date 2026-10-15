// Server-side validation only. No provider calls, reservations or paid dispatch.
export async function preflightCharacterLook(db, ownerUid, input) {
 if(!input || typeof input!=="object" || Array.isArray(input) || Object.keys(input).some(k=>k!=="draftId")) return {status:400,body:{error:"INVALID_REQUEST"}};
 const draftId=input.draftId;
 if(typeof draftId!=="string" || !/^[a-zA-Z0-9]{8,128}$/.test(draftId))return {status:400,body:{error:"INVALID_DRAFT_ID"}};
 const snapshot=await db.collection("characterLookDrafts").doc(draftId).get();
 if(!snapshot.exists || snapshot.data()?.ownerUid!==ownerUid)return {status:404,body:{error:"DRAFT_NOT_FOUND"}};
 const draft=snapshot.data();
 if(draft.status!=="draft" || typeof draft.characterId!=="string" || typeof draft.prompt!=="string" || draft.prompt.trim().length<5 || draft.prompt.length>3000 || !["strict","balanced","creative"].includes(draft.integrity) || !Array.isArray(draft.referenceAssetIds) || !draft.referenceAssetIds.length || draft.referenceAssetIds.length>30 || new Set(draft.referenceAssetIds).size!==draft.referenceAssetIds.length)return {status:422,body:{error:"INVALID_DRAFT"}};
 const ids=draft.referenceAssetIds;
 if(ids.some(id=>typeof id!=="string" || !/^[a-zA-Z0-9]{8,128}$/.test(id)))return {status:422,body:{error:"INVALID_REFERENCES"}};
 const snapshots=await Promise.all(ids.map(id=>db.collection("creativeAssets").doc(id).get()));
 const valid=snapshots.every(s=>s.exists && s.data()?.uploadedBy===ownerUid && (s.data()?.characterId===draft.characterId || s.data()?.owner?.kind==="character" && s.data()?.owner?.id===draft.characterId) && typeof s.data()?.storagePath==="string" && s.data()?.storagePath.startsWith("model-motion/users/"+ownerUid+"/"));
 if(!valid)return {status:422,body:{error:"REFERENCES_NOT_OWNED_OR_MISSING"}};
 return {status:200,body:{draftId,characterId:draft.characterId,integrity:draft.integrity,referenceCount:ids.length,referenceValidation:"passed",generationEnabled:false,paidDispatchEnabled:false,dispatchReady:false,blockers:["PROVIDER_MODEL_UNVERIFIED","PROVIDER_REFERENCE_INPUT_UNVERIFIED","PRICING_UNVERIFIED","SERVER_BUDGET_RESERVATION_NOT_ACTIVE"],message:"References verified. Image generation remains disabled."}};
}
