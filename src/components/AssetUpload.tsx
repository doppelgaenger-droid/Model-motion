import { useRef, useState } from "react";
import { firebaseConfigured } from "../lib/firebase";
import { deleteCreativeAsset, uploadCreativeAsset, type AssetOwner, type CreativeAssetType, type UploadedCreativeAsset } from "../assets/upload";

export function AssetUpload({ owner, type, onUploaded, existing }:{
  owner: AssetOwner;
  type: CreativeAssetType;
  onUploaded?: (asset: UploadedCreativeAsset) => void;
  existing?: UploadedCreativeAsset;
}) {
  const input = useRef<HTMLInputElement>(null);
  const slot = { "identity-reference": ["01 · Identity Reference", "01_identity-reference"], "character-board": ["02 · Character Board", "02_character-board"], "full-body-reference": ["03 · Full-body Reference", "03_full-body-reference"], "storyboard": ["Storyboard", "storyboard"], "location-reference": ["Location Reference", "location-reference"] }[type];
  const character = owner.kind === "character" ? owner.id.replace(/^character-/, "").replace(/-\d+$/, "") : owner.id;
  const filename = `${character}_${slot[1]}.png`;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function select(file?: File) {
    if (!file) return;
    setBusy(true); setError(null);
    try { const next = await uploadCreativeAsset(file, owner, type); if (existing) { try { await deleteCreativeAsset(existing, owner); } catch (error) { await deleteCreativeAsset(next, owner).catch(() => undefined); throw error; } } onUploaded?.(next); }
    catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return <div className="reference-empty upload-card">
    <input ref={input} className="asset-file-input" type="file" accept="image/*" onChange={e=>void select(e.target.files?.[0])}/>
    <button className="upload-trigger" disabled={busy || !firebaseConfigured} onClick={()=>input.current?.click()}>
      <div className="empty-symbol">{busy ? "…" : "＋"}</div>
      <b>{busy ? "Uploading…" : slot[0]}</b>
      <small>{firebaseConfigured ? filename : "Firebase configuration required"}</small>
    </button>
    {error && <small className="upload-error">{error}</small>}
  </div>;
}
