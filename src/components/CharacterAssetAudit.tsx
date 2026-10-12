import { previewCharacterMigration } from "../assets/migrationPreview";
import { verifyStorageObjects, type StorageCheck } from "../assets/verifyStorage";
import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { auditCharacterAssets } from "../assets/audit";
import type { UploadedCreativeAsset } from "../assets/upload";

export function CharacterAssetAudit() {
  const [assets, setAssets] = useState<UploadedCreativeAsset[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [checks, setChecks] = useState<StorageCheck[] | null>(null);
  const [checking, setChecking] = useState(false);
  const refresh = useCallback(async () => {
    setStatus("loading");
    setChecks(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Sign in to inspect your private asset records.");
      const snapshot = await getDocs(query(collection(db, "creativeAssets"), where("uploadedBy", "==", user.uid)));
      setAssets(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as UploadedCreativeAsset)));
      setStatus("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Audit failed");
      setStatus("error");
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const rows = auditCharacterAssets(assets);
  const preview = previewCharacterMigration(assets);
  const characterAssets = assets.filter(asset => asset.characterId?.startsWith("character-") || asset.owner?.kind === "character");
  async function verify() {
    setChecking(true);
    try { setChecks(await verifyStorageObjects(characterAssets)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Storage check failed"); }
    finally { setChecking(false); }
  }
  return <div className="studio">
    <div className="studio-head"><div><small>PRIVATE WORKSPACE / READ ONLY</small><h1>Character asset audit</h1></div><div className="head-meta"><button type="button" onClick={() => void refresh()} disabled={status === "loading"}>Refresh inventory</button></div></div>
    <div className="character-notes">
      <h2>Firebase metadata inventory</h2>
      <p>This report reads your private Firestore asset records without changing or deleting them. Storage object existence and file checksums are not verified.</p>
      {status === "loading" && <p role="status">Loading records…</p>}
      {status === "error" && <p role="alert">{error}</p>}
      {status === "ready" && <>
        <p role="status">{assets.length} total asset records · {rows.reduce((sum, row) => sum + row.total, 0)} canonical character reference records</p>
        <button type="button" disabled={checking} onClick={() => void verify()}>{checking ? "Checking Storage…" : "Verify Storage objects"}</button>
        {checks && <p role="status">Storage: {checks.filter(check => check.status === "verified").length} verified · {checks.filter(check => check.status !== "verified").length} not verified. This checks existence, not file content or checksums.</p>}
        {checks?.filter(check => check.status !== "verified").map(check => <p key={check.id} role="alert">{check.id}: {check.status} · {check.details}</p>)}
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",textAlign:"left",borderSpacing:"12px"}}>
            <thead><tr><th>Character</th><th>Slot</th><th>Total</th><th>Global</th><th>Legacy</th><th>Issues</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.characterId + row.slot}>
              <td>{row.characterId.includes("mara") ? "Mara" : "Lily"}</td>
              <td>{row.slot}</td><td>{row.total}</td><td>{row.global}</td><td>{row.legacy}</td>
              <td>{[row.total === 0 ? "Missing" : "",row.total > 1 ? "Multiple records" : "",row.duplicatePaths ? "Duplicate paths" : "",row.missingMetadata ? "Incomplete metadata" : ""].filter(Boolean).join(" · ") || "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <h2>F2.6 · Migration dry run</h2>
        <p>Preview only. No objects or metadata are changed. Destination existence is not checked unless already referenced by Firestore.</p>
        <p>{preview.filter(item => item.status === "candidate").length} candidates · {preview.filter(item => item.status === "already-global").length} global · {preview.filter(item => item.status === "conflict").length} conflicts · {preview.filter(item => item.status === "invalid").length} invalid</p>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",textAlign:"left",borderSpacing:"12px"}}>
            <thead><tr><th>Character / slot</th><th>Source</th><th>Proposed destination</th><th>Status</th></tr></thead>
            <tbody>{preview.map(item => <tr key={item.assetId}>
              <td>{item.characterId} / {item.slot}</td>
              <td style={{overflowWrap:"anywhere"}}>{item.sourcePath}</td>
              <td style={{overflowWrap:"anywhere"}}>{item.destinationPath}</td>
              <td>{item.status} · {item.reason}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </div>
  </div>;
}
