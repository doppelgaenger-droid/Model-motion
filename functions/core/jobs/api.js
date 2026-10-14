import { createDraft, getDraft } from "./firestore.js";

const MAX_REQUEST_BYTES = 4096;
const allowedDraftFields = new Set(["provider","characterId","idempotencyKey","requestedBudgetUsd"]);

export async function handleJobRequest({ path, body, ownerUid, db }) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { status:400, body:{error:"INVALID_REQUEST"} };
  }
  if (Buffer.byteLength(JSON.stringify(body),"utf8") > MAX_REQUEST_BYTES) {
    return { status:413, body:{error:"REQUEST_TOO_LARGE"} };
  }
  if (path === "/jobs/draft") {
    if (Object.keys(body).some(key => !allowedDraftFields.has(key))) {
      return { status:400, body:{error:"UNSUPPORTED_FIELD"} };
    }
    try {
      const result=await createDraft(db,body,ownerUid);
      return {status:result.created ? 201:200, body:{
        created:result.created, job:result.job, generationEnabled:false, paidDispatchEnabled:false
      }};
    } catch(error) {
      if(error.code === "IDEMPOTENCY_CONFLICT") return {status:409,body:{error:"IDEMPOTENCY_CONFLICT"}};
      if(error.message === "INVALID_DRAFT" || error.message === "INVALID_JOB_BUDGET") {
        return {status:400,body:{error:"INVALID_DRAFT"}};
      }
      throw error;
    }
  }
  if (path === "/jobs/get") {
    if (Object.keys(body).length !== 1 || typeof body.jobId !== "string") {
      return {status:400,body:{error:"INVALID_JOB_ID"}};
    }
    try {
      const job=await getDraft(db,body.jobId,ownerUid);
      return job ? {status:200,body:{job,generationEnabled:false,paidDispatchEnabled:false}} :
        {status:404,body:{error:"JOB_NOT_FOUND"}};
    } catch(error) {
      if(error.code === "INVALID_JOB_ID") return {status:400,body:{error:"INVALID_JOB_ID"}};
      throw error;
    }
  }
  return {status:404,body:{error:"UNKNOWN_ROUTE"}};
}
