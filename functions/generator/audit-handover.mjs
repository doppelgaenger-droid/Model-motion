/**
 * Read-only UID handover inventory. Requires Application Default Credentials.
 * Never logs provider credentials, document contents, personal emails, or download URLs.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
const projectId = "model-motion";
const oldUid = "muju7doq6xYWBToKNpMw6LKnbBw1";
const newUid = "JZK1aIhqo5Zgl0oEbdCjhlko5qC3";
if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();
const bucket = getStorage().bucket("model-motion.firebasestorage.app");
const report = { projectId, readOnly: true, generatedAt: new Date().toISOString(), owners: {} };
for (const uid of [oldUid, newUid]) {
  const data = { creativeAssets: 0, sceneCast: 0, privateSceneSnapshots: 0, storageObjects: 0, storageBytes: 0 };
  const assets = await db.collection("creativeAssets").where("uploadedBy", "==", uid).count().get();
  data.creativeAssets = assets.data().count;
  for (const [name, collection] of [["sceneCast", "sceneCast"], ["privateSceneSnapshots", "privateSceneSnapshots"]]) {
    const snap = await db.collection(collection).doc(uid).collection("scenes").count().get();
    data[name] = snap.data().count;
  }
  const [objects] = await bucket.getFiles({ prefix: `model-motion/users/${uid}/`, autoPaginate: true });
  data.storageObjects = objects.length;
  data.storageBytes = objects.reduce((sum, object) => sum + Number(object.metadata.size || 0), 0);
  report.owners[uid === oldUid ? "legacy" : "dedicated"] = data;
}
console.log(JSON.stringify(report, null, 2));
