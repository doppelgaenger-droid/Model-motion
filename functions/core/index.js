import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { handleJobRequest } from "./jobs/api.js";
import { publicRegistry } from "./registry.js";

if (!getApps().length) initializeApp();
const OWNER_UID = "JZK1aIhqo5Zgl0oEbdCjhlko5qC3";
const ALLOWED_ORIGIN = "https://doppelgaenger-droid.github.io";

export const modelMotionCoreEu = onRequest({
  region: "europe-west1",
  serviceAccount: "model-motion-core-runtime@model-motion.iam.gserviceaccount.com",
  cors: false, maxInstances: 1, timeoutSeconds: 30
}, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Vary", "Origin");
  if (req.headers.origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(req.headers.origin === ALLOWED_ORIGIN ? 204 : 403).end();
  if (req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
  if (req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) return res.status(403).json({error:"Origin denied"});
  const token = /^Bearer (.+)$/.exec(String(req.headers.authorization ?? ""))?.[1];
  if (!token) return res.status(401).json({error:"Authentication required"});
  try {
    const user = await getAuth().verifyIdToken(token, true);
    if (user.uid !== OWNER_UID) return res.status(403).json({error:"Private access only"});
  } catch {
    return res.status(401).json({error:"Authentication required"});
  }
  if (req.path.startsWith("/jobs/")) {
    try {
      const result = await handleJobRequest({path:req.path,body:req.body,ownerUid:OWNER_UID,db:getFirestore()});
      return res.status(result.status).json(result.body);
    } catch {
      console.error("Core draft API request failed");
      return res.status(500).json({error:"JOB_BACKEND_ERROR"});
    }
  }
  if (req.path !== "/providers") return res.status(404).json({error:"Unknown route"});
  return res.status(200).json({
    version: 1, region: "europe-west1", generationEnabled: false,
    paidDispatchEnabled: false, providers: publicRegistry()
  });
});
