import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export const LILY_PROJECT_ID = "lily";
export const LILY_CHARACTER_ID = "character-lily-001";

export const lilyProfile = {
  name: "Lily", age: 24, version: "1.0",
  archetype: "Gamer / Streamer",
  personality: ["playful", "curious", "witty", "independent"],
  visualDNA: {
    hair: "Short blue/cyan bob with bangs and pink highlights",
    eyes: "Brown", style: "Cyber / Cute / Neon",
    signature: ["pink-black over-ear headphones", "cyan top", "pink bow", "pink ruffled skirt"],
    palette: ["#00D1FF", "#FF5CC7", "#7A5CFF", "#0B0F1A"]
  },
  interests: ["gaming", "music", "technology", "anime", "photography"],
  continuity: ["Maintain short bob and bangs", "Keep brown eyes", "Keep adult appearance", "Maintain facial proportions"],
};

export async function ensureLilyProject(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Authentication required");
  const reference = doc(db, "projects", LILY_PROJECT_ID);
  const existing = await getDoc(reference);
  if (!existing.exists()) {
    await setDoc(reference, {
      name: "Lily", ownerUid: user.uid, characterId: LILY_CHARACTER_ID,
      type: "character-development", status: "draft", profile: lilyProfile,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
  }
}
