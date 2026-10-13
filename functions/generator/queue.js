/**
 * R2 durable queue API. Deliberately DOES NOT dispatch to a provider.
 * The API runs only after explicit Firebase deployment, which is not part of this PR.
 */
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";

if (!getApps().length) initializeApp();
const db = getFirestore();
const ownerUid = process.env.GENERATOR_OWNER_UID;
const origin = process.env.GENERATOR_ALLOWED_ORIGIN;
const jobs = db.collection("generationQueue");
const keys = db.collection("generationRequestKeys");
const maxPayloadBytes = 12000;

const errors = (res, status, code) => res.status(status).json({error:code});
function cents(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 ||
      Math.abs(value * 100 - Math.round(value * 100)) > 1e-7 ||
      !Number.isSafeInteger(Math.round(value * 100))) throw new Error("invalid_budget");
  return Math.round(value * 100);
}
function safeId(v) { return typeof v === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(v); }
function effectivePrivacy(classes) {
  if (!Array.isArray(classes) || !classes.length || classes.some(x => !["standard","sensitive","local_only"].includes(x))) throw new Error("invalid_privacy");
  return classes.includes("local_only") ? "local_only" : classes.includes("sensitive") ? "sensitive" : "standard";
}
function visible(job) {
  if (!job) return null;
  const {ownerUid, ...safe} = job;
  return safe;
}
export const queueGateway = onRequest({cors:false, maxInstances:2, timeoutSeconds:30, invoker:"public"}, async (req,res) => {
  res.set("Cache-Control","no-store");
  if (origin && req.headers.origin === origin) {
    res.set("Access-Control-Allow-Origin",origin);
    res.set("Access-Control-Allow-Headers","authorization,content-type");
    res.set("Access-Control-Allow-Methods","POST,OPTIONS");
    res.set("Vary","Origin");
  }
  if (req.method === "OPTIONS") return res.status(origin && req.headers.origin === origin ? 204 : 403).end();
  if (req.method !== "POST") return errors(res,405,"method_not_allowed");
  if (!ownerUid || !origin) return errors(res,503,"unconfigured");
  if (req.headers.origin !== origin) return errors(res,403,"origin_denied");
  if (Number(req.headers["content-length"] || 0) > maxPayloadBytes) return errors(res,413,"payload_too_large");
  const token = String(req.headers.authorization || "").replace(/^Bearer /,"");
  let uid;
  try { uid = (await getAuth().verifyIdToken(token,true)).uid; }
  catch { return errors(res,401,"unauthenticated"); }
  if (uid !== ownerUid) return errors(res,403,"owner_only");
  const action = req.path.split("/").filter(Boolean).at(-1);
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return errors(res,400,"invalid_payload");
  try {
    if (action === "create") {
      const {shotId,takeId,inputSnapshotId,idempotencyKey,referenceClasses,budgetUsd = 0.50} = body;
      if (![shotId,takeId,inputSnapshotId,idempotencyKey].every(safeId)) return errors(res,400,"invalid_identifiers");
      const budgetCents = cents(budgetUsd);
      const privacyClass = effectivePrivacy(referenceClasses);
      // The request binds stable IDs only. References are not transmitted to providers.
      const digest = createHash("sha256").update(JSON.stringify({uid,shotId,takeId,inputSnapshotId,privacyClass,budgetCents})).digest("hex");
      const keyRef = keys.doc(createHash("sha256").update(uid + ":" + idempotencyKey).digest("hex"));
      const jobRef = jobs.doc();
      const result = await db.runTransaction(async tx => {
        const current = await tx.get(keyRef);
        if (current.exists) {
          if (current.data().digest !== digest) throw new Error("idempotency_conflict");
          const prior = await tx.get(jobs.doc(current.data().jobId));
          if (!prior.exists) throw new Error("missing_idempotent_job");
          return {jobId:prior.id, ...visible(prior.data())};
        }
        const record = {ownerUid:uid,shotId,takeId,inputSnapshotId,privacyClass,
          maxCostCents:budgetCents,status:"draft",revision:0,attempt:0,
          providerId:null,providerJobId:null,estimatedCostCents:null,actualCostCents:null,
          dispatchEnabled:false,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
        tx.create(jobRef,record);
        tx.create(keyRef,{ownerUid:uid,jobId:jobRef.id,digest,createdAt:FieldValue.serverTimestamp()});
        return {jobId:jobRef.id, ...visible(record)};
      });
      return res.status(201).json(result);
    }
    if (action === "budget" || action === "cancel" || action === "status" || action === "validate") {
      const {jobId} = body;
      if (!safeId(jobId)) return errors(res,400,"invalid_job_id");
      const ref = jobs.doc(jobId);
      if (action === "status") {
        const snap=await ref.get();
        if (!snap.exists || snap.data().ownerUid !== uid) return errors(res,404,"not_found");
        return res.json({jobId,...visible(snap.data())});
      }
      if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) return errors(res,400,"invalid_revision");
      const result = await db.runTransaction(async tx => {
        const snap=await tx.get(ref);
        if (!snap.exists || snap.data().ownerUid !== uid) throw new Error("not_found");
        const doc=snap.data();
        if (doc.revision !== body.expectedRevision) throw new Error("revision_conflict");
        const patch={updatedAt:FieldValue.serverTimestamp(),revision:doc.revision+1};
        if (action === "budget") {
          if (!["draft","blocked_budget","blocked_price_unknown","blocked_privacy","blocked_capability"].includes(doc.status)) throw new Error("invalid_transition");
          patch.maxCostCents=cents(body.budgetUsd);
          patch.status="draft"; // revalidation required on any budget change
        } else if (action === "cancel") {
          if (!["draft","blocked_budget","blocked_price_unknown","blocked_privacy","blocked_capability","queued"].includes(doc.status)) throw new Error("invalid_transition");
          patch.status="cancelled";
        } else if (action === "validate") {
          // Fail-closed: provider offers must come from a trusted server-side registry, not client-supplied prices.
          if (!["draft","blocked_budget","blocked_price_unknown","blocked_privacy","blocked_capability"].includes(doc.status)) throw new Error("invalid_transition");
          patch.status="blocked_price_unknown";
        }
        tx.update(ref,patch);
        return {jobId,status:patch.status,revision:patch.revision,maxCostCents:patch.maxCostCents ?? doc.maxCostCents};
      });
      return res.json(result);
    }
    return errors(res,404,"unknown_action");
  } catch (error) {
    const code=error instanceof Error ? error.message : "internal";
    const client=["invalid_budget","invalid_privacy","idempotency_conflict","missing_idempotent_job","invalid_transition","revision_conflict","not_found"];
    const status=code==="not_found" ? 404 : code==="revision_conflict" || code==="idempotency_conflict" ? 409 : client.includes(code) ? 400 : 500;
    if (status === 500) console.error("queueGateway unexpected failure",error);
    return errors(res,status,status===500 ? "internal" : code);
  }
});
