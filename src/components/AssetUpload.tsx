import { useRef, useState } from "react";
import { firebaseConfigured } from "../lib/firebase";
import { deleteCreativeAsset, uploadCreativeAsset, type AssetOwner, type CreativeAssetType, type UploadedCreativeAsset } from "../assets/upload";

export function AssetUpload({ owner, type, label, hint, onUploaded, existing }:{
  owner: AssetOwner;
  type: CreativeAssetType;
  label: string;
  hint: string;
  onUploaded?: (asset: UploadedCreativeAsset) => void;
  existing?: UploadedCreativeAsset;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function select(file?: File) {
    if (!file) return;
    setBusy(true); setError(null);
    try { const next = await uploadCreativeAsset(file, owner, type); if (existing) await deleteCreativeAsset(existing, owner); onUploaded?.(next); }
    catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return <div className="reference-empty upload-card">
    <input ref={input} className="asset-file-input" type="file" accept="image/*" onChange={e=>void select(e.target.files?.[0])}/>
    <button className="upload-trigger" disabled={busy || !firebaseConfigured} onClick={()=>input.current?.click()}>
      <div className="empty-symbol">{busy ? "…" : "＋"}</div>
      <b>{busy ? "Uploading…" : existing ? "Replace reference" : label}</b>
      <small>{firebaseConfigured ? hint : "Firebase configuration required"}</small>
    </button>
    {error && <small className="upload-error">{error}</small>}
  </div>;
}
