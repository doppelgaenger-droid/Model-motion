import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const runpodKey = defineSecret("RUNPOD_API_KEY");
const falKey = defineSecret("FAL_KEY");
const OWNER_UID = process.env.GENERATOR_OWNER_UID;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const FAL_MODEL_PATH = process.env.FAL_MODEL_PATH;
const ALLOWED_ORIGIN = process.env.GENERATOR_ALLOWED_ORIGIN;
const jobs = getFirestore().collection("generationJobs");

function fail(res, status, message) { res.status(status).json({ error: message }); }
function providerStatus(status) {
  if (status === "COMPLETED" || status === "completed") return "completed";
  if (status === "FAILED" || status === "CANCELLED" || status === "failed") return "failed";
  if (status === "IN_PROGRESS" || status === "processing") return "processing";
  return "queued";
}
export const generatorGateway = onRequest({ secrets: [runpodKey, falKey], cors: false, timeoutSeconds: 60, maxInstances: 2 }, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (ALLOWED_ORIGIN && req.headers.origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") { res.status(req.headers.origin === ALLOWED_ORIGIN ? 204 : 403).end(); return; }
  if (req.method !== "POST") return fail(res,405,"Method not allowed");
  if (ALLOWED_ORIGIN && req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) return fail(res,403,"Origin not allowed");
  if (!OWNER_UID || !ALLOWED_ORIGIN) return fail(res,503,"Gateway configuration incomplete");
  let uid;
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer /,"");
    uid = (await getAuth().verifyIdToken(token, true)).uid;
  } catch { return fail(res,401,"Authentication required"); }
  if (uid !== OWNER_UID) return fail(res,403,"Private generator access only");
  const action = (req.path || "").split("/").filter(Boolean).at(-1);
  try {
    if (action === "generate") {
      // Fail closed: prototype bypasses the audited price reservation and privacy checks.
      // Retain legacy code temporarily for migration, but no direct provider submission is permitted.
      return fail(res, 503, "Direct generation disabled until budget-enforced router cutover");
      const { provider, characterId, referenceAssetId, prompt, negativePrompt, aspectRatio } = req.body || {};
      if (!["runpod","fal"].includes(provider) || !["character-mara-001","character-lily-001"].includes(characterId) || typeof prompt !== "string" || !prompt.trim() || prompt.length > 3000) return fail(res,400,"Invalid generation parameters");
      if (negativePrompt && (typeof negativePrompt !== "string" || negativePrompt.length > 2000)) return fail(res,400,"Invalid negative prompt");
      let referenceUrl;
      if (referenceAssetId) {
        if (typeof referenceAssetId !== "string") return fail(res,400,"Invalid reference ID");
        const snap = await getFirestore().collection("creativeAssets").doc(referenceAssetId).get();
        const asset = snap.data();
        if (!asset || asset.uploadedBy !== uid || asset.characterId !== characterId && asset.owner?.id !== characterId) return fail(res,403,"Reference is not owned by this character");
        referenceUrl = asset.downloadUrl;
      }
      if (provider === "fal") return fail(res,501,"fal adapter not configured: a model-specific request schema is required");
      if (!RUNPOD_ENDPOINT_ID) return fail(res,503,"RunPod endpoint not configured");
      const payload = { input: { prompt, negative_prompt: negativePrompt || "", aspect_ratio: aspectRatio === "3:4" ? "3:4" : "3:4", reference_image: referenceUrl || null, character_id: characterId } };
      // IMPORTANT: configure a RunPod worker that implements this explicit input contract.
      const response = await fetch(`https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${runpodKey.value()}` }, body:JSON.stringify(payload), signal:AbortSignal.timeout(45000) });
      const result = await response.json();
      if (!response.ok || !result.id) return fail(res,502,"RunPod job submission failed");
      await jobs.doc(result.id).set({ uid, provider, characterId, referenceAssetId:referenceAssetId || null, status:"queued", createdAt:new Date(), prompt, negativePrompt:negativePrompt || "" });
      return res.status(202).json({ jobId:result.id, status:"queued" });
    }
    if (action === "status") {
      const jobId = req.body?.jobId;
      if (typeof jobId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(jobId)) return fail(res,400,"Invalid job ID");
      const record = await jobs.doc(jobId).get();
      if (!record.exists || record.data()?.uid !== uid) return fail(res,404,"Job not found");
      const response = await fetch(`https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${jobId}`, { headers:{Authorization:`Bearer ${runpodKey.value()}`}, signal:AbortSignal.timeout(45000) });
      if (!response.ok) return fail(res,502,"Unable to fetch job status");
      const result = await response.json();
      const status = providerStatus(result.status);
      // A worker must return an HTTPS image URL; storing outputs in private Storage is a subsequent milestone.
      const imageUrl = typeof result.output?.imageUrl === "string" && result.output.imageUrl.startsWith("https://") ? result.output.imageUrl : undefined;
      await record.ref.update({status,updatedAt:new Date()});
      return res.json({jobId,status,imageUrl,error: status==="failed" ? "Generation failed" : undefined});
    }
    return fail(res,404,"Unknown generator action");
  } catch (error) {
    console.error("Generator gateway error",error);
    return fail(res,500,"Generator backend error");
  }
});

