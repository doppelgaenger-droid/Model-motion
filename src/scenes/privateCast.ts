import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";

const DEFAULT_CAST = ["character-mara-001"];
const ALLOWED_CHARACTER_IDS = new Set(["character-mara-001", "character-lily-001"]);
const VALID_SCENES = new Set(["room-714"]);

export function usePrivateSceneCast(sceneId: string) {
  const [cast, setCast] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let stopSnapshot: (() => void) | undefined;
    setReady(false);
    setError(null);
    const stopAuth = onAuthStateChanged(auth, user => {
      stopSnapshot?.();
      stopSnapshot = undefined;
      setReady(false);
      setCast([]);
      if (!user || !VALID_SCENES.has(sceneId)) return;
      const sceneRef = doc(db, "sceneCast", user.uid, "scenes", sceneId);
      stopSnapshot = onSnapshot(sceneRef, snapshot => {
        const data = snapshot.data();
        const incoming = data?.characterIds;
        setCast(snapshot.exists() && Array.isArray(incoming)
          ? [...new Set(incoming.filter((id: unknown): id is string => typeof id === "string" && ALLOWED_CHARACTER_IDS.has(id)))]
          : DEFAULT_CAST);
        setReady(true);
        setError(null);
      }, () => { setReady(false); setError("Could not load private scene cast."); });
    });
    return () => { stopSnapshot?.(); stopAuth(); };
  }, [sceneId]);

  async function toggle(characterId: string) {
    const user = auth.currentUser;
    if (!user || !ready || saving || !VALID_SCENES.has(sceneId) || !ALLOWED_CHARACTER_IDS.has(characterId)) return;
    const updated = cast.includes(characterId) ? cast.filter(id => id !== characterId) : [...cast, characterId];
    setSaving(true);
    setError(null);
    try {
      await setDoc(doc(db, "sceneCast", user.uid, "scenes", sceneId), {
        characterIds: updated, ownerUid: user.uid, sceneId, updatedAt: serverTimestamp(),
      }, { merge: true });
      // Snapshot is the source of truth; never claim success based on an optimistic local mutation.
    } catch {
      setError("Could not save scene cast. Your previous selection is unchanged.");
    } finally {
      setSaving(false);
    }
  }
  return { cast, ready, saving, error, toggle };
}
