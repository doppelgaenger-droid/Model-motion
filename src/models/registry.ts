import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type CustomModel = { id:string; name:string; description:string; projectId:string; ownerUid:string };
const collectionRef = () => collection(db,"characterRegistry");

export async function listCustomModels():Promise<CustomModel[]> {
  const user=auth.currentUser;
  if (!user) throw new Error("Sign in to access your models.");
  const docs=await getDocs(query(collectionRef(),where("ownerUid","==",user.uid)));
  return docs.docs.map(snapshot=>({id:snapshot.id,...snapshot.data(),projectId:"character-library"} as CustomModel))
    .filter(model=>model.ownerUid===user.uid && typeof model.name==="string")
    .sort((a,b)=>a.name.localeCompare(b.name));
}

export async function createCustomModel(name:string,description:string):Promise<CustomModel> {
  const user=auth.currentUser;
  if (!user) throw new Error("Sign in before creating a model.");
  const cleanName=name.trim().replace(/\s+/g," ");
  if (cleanName.length<2 || cleanName.length>80) throw new Error("The model name must be 2–80 characters.");
  const cleanDescription=description.trim();
  if (cleanDescription.length>1000) throw new Error("Description must be at most 1000 characters.");
  const payload={name:cleanName,description:cleanDescription,ownerUid:user.uid,createdAt:serverTimestamp(),schemaVersion:1};
  const created=await addDoc(collectionRef(),payload);
  return {id:created.id,name:cleanName,description:cleanDescription,ownerUid:user.uid,projectId:"character-library"};
}
