import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

export function AuthGate({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(auth.currentUser);
  const [ready,setReady]=useState(false);
  useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setReady(true)}),[]);
  if(!ready) return <div className="auth-screen"><span>MODEL MOTION</span><p>Connecting…</p></div>;
  if(!user) return <div className="auth-screen"><span>MODEL MOTION</span><h1>Production workspace</h1><p>Sign in to access project assets and uploads.</p><button className="primary-action" onClick={()=>void signInWithPopup(auth,googleProvider)}>Continue with Google</button></div>;
  return <><div className="auth-session"><span>{user.email}</span><button onClick={()=>void signOut(auth)}>Sign out</button></div>{children}</>;
}
