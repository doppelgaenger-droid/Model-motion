import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp();
const sogniKey = defineSecret("SOGNI_API_KEY");
const OWNER_UID = process.env.GENERATOR_OWNER_UID;
const ALLOWED_ORIGIN = process.env.GENERATOR_ALLOWED_ORIGIN;
function fail(res, code, message) { return res.status(code).json({ error: message }); }

/**
 * Owner-only credential verification gateway. Paid generation remains disabled.
 * This preserves the existing function name and authentication boundary without
 * requiring unused legacy provider secrets.
 */
export const generatorGateway = onRequest({
  secrets: [sogniKey], cors: false, timeoutSeconds: 30, maxInstances: 2,
}, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (ALLOWED_ORIGIN && req.headers.origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") return res.status(req.headers.origin === ALLOWED_ORIGIN ? 204 : 403).end();
  if (req.method !== "POST") return fail(res, 405, "Method not allowed");
  if (ALLOWED_ORIGIN && req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) return fail(res, 403, "Origin not allowed");
  if (!OWNER_UID || !ALLOWED_ORIGIN) return fail(res, 503, "Gateway configuration incomplete");
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer /, "");
    const decoded = await getAuth().verifyIdToken(token, true);
    if (decoded.uid !== OWNER_UID) return fail(res, 403, "Private generator access only");
  } catch {
    return fail(res, 401, "Authentication required");
  }
  const action = (req.path || "").split("/").filter(Boolean).at(-1);
  if (action === "generate" || action === "status") {
    return fail(res, 503, "Generation remains disabled pending audited budget and privacy cutover");
  }
  if (action !== "sogni-check") return fail(res, 404, "Unknown generator action");
  try {
    const response = await fetch("https://api.sogni.ai/v1/creative-agent/workflows?limit=1", {
      headers: { Authorization: `Bearer ${sogniKey.value()}` },
      signal: AbortSignal.timeout(12000),
    });
    if (response.status === 401 || response.status === 403) return fail(res, 502, "Sogni rejected backend credential");
    if (!response.ok) return fail(res, 502, `Sogni read-only check failed (HTTP ${response.status})`);
    return res.json({ provider: "sogni", authenticated: true, billingEnabled: false, dispatchEnabled: false });
  } catch {
    return fail(res, 502, "Sogni authentication check unavailable");
  }
});
