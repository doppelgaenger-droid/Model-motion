import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export interface PrivateProject {
  id: string;
  title: string;
  characters: Array<{ id: string; displayName: string; age?: number; description?: string; wardrobe?: string }>;
  locations: Array<{ id: string; displayName: string; meta?: string }>;
  scenes: Array<{ id: string; title: string; shots: Array<{ id: string; title: string; duration: string; action: string; status: string }> }>;
}

export async function loadPrivateProject(): Promise<PrivateProject | null> {
  if (!auth.currentUser) return null;
  const snapshot = await getDoc(doc(db, "projects", "primary"));
  return snapshot.exists() ? snapshot.data() as PrivateProject : null;
}

export async function createPrivateProject(title: string): Promise<PrivateProject> {
  const user = auth.currentUser;
  if (!user) throw new Error("Authentication required");
  const project: PrivateProject = { id: "primary", title, characters: [], locations: [], scenes: [] };
  await setDoc(doc(db, "projects", "primary"), { ...project, ownerUid: user.uid, createdAt: serverTimestamp() });
  return project;
}
