import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) initializeApp();
const sogniKey = defineSecret("SOGNI_API_KEY");
const OWNER_UID = "JZK1aIhqo5Zgl0oEbdCjhlko5qC3";
const ALLOWED_ORIGIN = "https://doppelgaenger-droid.github.io";

export const sogniCredentialCheck = onRequest(
  { region: "europe-west1", secrets: [sogniKey], serviceAccount: "model-motion-runtime@model-motion.iam.gserviceaccount.com", cors: false, timeoutSeconds: 30, maxInstances: 1 },
  async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.headers.origin === ALLOWED_ORIGIN) {
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      res.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") return res.status(req.headers.origin === ALLOWED_ORIGIN ? 204 : 403).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) return res.status(403).json({ error: "Origin denied" });
    const token = /^Bearer (.+)$/.exec(String(req.headers.authorization ?? ""))?.[1];
    if (!token) return res.status(401).json({ error: "Authentication required" });
    try {
      const user = await getAuth().verifyIdToken(token, true);
      if (user.uid !== OWNER_UID) return res.status(403).json({ error: "Private access only" });
    } catch {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const response = await fetch("https://api.sogni.ai/v1/creative-agent/workflows?limit=1", {
        headers: { Authorization: `Bearer ${sogniKey.value()}` },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) return res.status(502).json({ error: "Provider check failed", providerHttpStatus: response.status });
      return res.status(200).json({ provider: "sogni", credentialAccepted: true, generationEnabled: false, paidDispatchEnabled: false });
    } catch {
      return res.status(502).json({ error: "Provider unavailable" });
    }
  }
);
