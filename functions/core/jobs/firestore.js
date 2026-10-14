import { createHash } from "node:crypto";
import { makeDraft } from "./contracts.js";

const COLLECTION = "modelMotionCoreJobs";
const sha256 = value => createHash("sha256").update(value).digest("hex");
const publicFields = record => ({
  id: record.id, status: record.status, provider: record.provider,
  characterId: record.characterId, budgetCents: record.budgetCents,
  createdAt: record.createdAt ?? null
});
export async function createDraft(db, input, ownerUid) {
  const draft = makeDraft({ ...input, uid: ownerUid });
  const id = sha256("v1:" + ownerUid + ":" + draft.idempotencyKey);
  const requestHash = sha256(JSON.stringify({
    ownerUid, provider: draft.provider, characterId: draft.characterId,
    budgetCents: draft.budgetCents
  }));
  const ref = db.collection(COLLECTION).doc(id);
  return db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      const prior = existing.data();
      if (prior.ownerUid !== ownerUid || prior.requestHash !== requestHash) {
        const error = new Error("IDEMPOTENCY_CONFLICT");
        error.code = "IDEMPOTENCY_CONFLICT"; throw error;
      }
      return { created: false, job: publicFields({ id, ...prior }) };
    }
    const now = new Date();
    const doc = { ...draft, requestHash, createdAt: now, updatedAt: now };
    tx.create(ref, doc);
    return { created: true, job: publicFields({ id, ...doc }) };
  });
}
export async function getDraft(db, jobId, ownerUid) {
  if (typeof jobId !== "string" || !/^[a-f0-9]{64}$/.test(jobId)) {
    const e = new Error("INVALID_JOB_ID"); e.code = "INVALID_JOB_ID"; throw e;
  }
  const snapshot = await db.collection(COLLECTION).doc(jobId).get();
  if (!snapshot.exists || snapshot.data()?.ownerUid !== ownerUid) return null;
  return publicFields({ id: jobId, ...snapshot.data() });
}
