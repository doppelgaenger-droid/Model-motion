import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type PrivateShot = { id: string; title: string; duration: string; action: string; status: string };
export type PrivateSceneSnapshot = {
  schemaVersion: 1;
  sceneId: string;
  title: string;
  location: string;
  shots: PrivateShot[];
};

/** Read-only probe: migration is never triggered by page load. */
export async function readPrivateSceneSnapshot(sceneId: string): Promise<PrivateSceneSnapshot | null> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  if (sceneId !== "room-714") throw new Error("Unknown scene.");
  const snapshot = await getDoc(doc(db, "privateSceneSnapshots", user.uid, "scenes", sceneId));
  if (!snapshot.exists()) return null;
  const value = snapshot.data();
  if (value.ownerUid !== user.uid || value.schemaVersion !== 1 || value.sceneId !== sceneId ||
    typeof value.title !== "string" || typeof value.location !== "string" || !Array.isArray(value.shots)) {
    throw new Error("Private scene snapshot requires manual review.");
  }
  return { schemaVersion: 1, sceneId, title: value.title, location: value.location, shots: value.shots as PrivateShot[] };
}

/** Explicit copy-first migration. Never overwrites existing private data. */
export async function savePrivateSceneSnapshot(baseline: PrivateSceneSnapshot): Promise<"created" | "already_exists"> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  if (baseline.schemaVersion !== 1 || baseline.sceneId !== "room-714" || baseline.shots.length !== 4 ||
    baseline.shots.some(s => !s.id || !s.title || !s.action)) throw new Error("Unexpected scene snapshot.");
  const ref = doc(db, "privateSceneSnapshots", user.uid, "scenes", baseline.sceneId);
  return runTransaction(db, async tx => {
    const existing = await tx.get(ref);
    if (existing.exists()) return "already_exists" as const;
    tx.set(ref, { ...baseline, ownerUid: user.uid, migratedAt: serverTimestamp(), source: "legacy-public-scene-v1" });
    return "created" as const;
  });
}
