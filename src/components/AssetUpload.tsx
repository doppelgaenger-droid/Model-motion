import { useRef, useState } from "react";
import { firebaseConfigured } from "../lib/firebase";
import { uploadCreativeAsset, type AssetOwner, type CreativeAssetType, type UploadedCreativeAsset } from "../assets/upload";

export function AssetUpload({ owner, type, label, hint, onUploaded }:{
  owner: AssetOwner;
  type: CreativeAssetType;
  label: string;
  hint: string;
  onUploaded?: (asset: UploadedCreativeAsset) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function select(file?: File) {
    if (!file) return;
    setBusy(true); setError(null);
    try { onUploaded?.(await uploadCreativeAsset(file, owner, type)); }
    catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return <div className="reference-empty upload-card">
    <input ref={input} className="asset-file-input" type="file" accept="image/*" onChange={e=>void select(e.target.files?.[0])}/>
    <button className="upload-trigger" disabled={busy || !firebaseConfigured} onClick={()=>input.current?.click()}>
      <div className="empty-symbol">{busy ? "…" : "＋"}</div>
      <b>{busy ? "Uploading…" : label}</b>
      <small>{firebaseConfigured ? hint : "Firebase configuration required"}</small>
    </button>
    {error && <small className="upload-error">{error}</small>}
  </div>;
}
