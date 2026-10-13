import { inspectMigrationDestinations, type DestinationCheck } from "../assets/destinationAudit";
import { deleteCreativeAsset } from "../assets/upload";
import { UIConfirmDialog, UIProgress, UINotice } from "../foundation/ui/feedback";
import { UIButton } from "../foundation/ui/controls";
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
  const [destinationChecks, setDestinationChecks] = useState<DestinationCheck[] | null>(null);
  const [inspectingDestinations, setInspectingDestinations] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [resetMessage, setResetMessage] = useState("");
  const refresh = useCallback(async () => {
    setStatus("loading");
    setChecks(null);
    setDestinationChecks(null);
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
  async function inspectDestinations() {
    setInspectingDestinations(true);
    try { setDestinationChecks(await inspectMigrationDestinations(assets)); }
    catch (cause) { setResetMessage(cause instanceof Error ? cause.message : "Destination audit failed."); }
    finally { setInspectingDestinations(false); }
  }
  const legacy = assets.filter(asset => asset.owner?.kind === "character" &&
    (asset.owner.id === "character-mara-001" || asset.owner.id === "character-lily-001") &&
    (asset.type === "identity-reference" || asset.type === "character-board" || asset.type === "full-body-reference") &&
    asset.schemaVersion !== 3);
  const canReset = !resetting && status === "ready" && backupConfirmed && legacy.length === 6 &&
    rows.every(row => row.legacy === 1 && row.global === 0 && row.total === 1) &&
    destinationChecks?.length === 6 && destinationChecks.every(item => item.status === "empty");
  async function resetLegacyReferences() {
    if (!canReset) return;
    setResetting(true);
    setResetMessage("");
    setProgress({done:0,total:legacy.length});
    let done = 0;
    try {
      for (const asset of legacy) {
        if (asset.owner.kind !== "character") throw new Error("Invalid owner");
        await deleteCreativeAsset(asset, asset.owner);
        done++;
        setProgress({done,total:legacy.length});
      }
      setResetMessage("Six legacy reference records deleted. Room 714 and its scenes were not touched. You may now upload new global character references.");
      setConfirmReset(false);
      await refresh();
    } catch (error) {
      setResetMessage(`Stopped after ${done} of ${legacy.length} references. Do not repeat blindly. ${error instanceof Error ? error.message : String(error)}`);
      setConfirmReset(false);
      await refresh();
    } finally { setResetting(false); }
  }
  return <div className="studio">
    <div className="studio-head"><div><small>PRIVATE WORKSPACE / READ ONLY</small><h1>Character asset audit</h1></div><div className="head-meta"><UIButton onClick={() => void refresh()} disabled={status === "loading"}>Refresh inventory</UIButton></div></div>
    <div className="character-notes">
      <h2>Firebase metadata inventory</h2>
      <p>This report reads your private Firestore asset records without changing or deleting them. Storage object existence and file checksums are not verified.</p>
      {status === "loading" && <p role="status">Loading records…</p>}
      {status === "error" && <UINotice tone="error">{error}</UINotice>}
      {status === "ready" && <>
        <p role="status">{assets.length} total asset records · {rows.reduce((sum, row) => sum + row.total, 0)} canonical character reference records</p>
        <UIButton variant="primary" disabled={checking} onClick={() => void verify()}>{checking ? "Checking Storage…" : "Verify Storage objects"}</UIButton>
        {checks && <UINotice tone={checks.every(check => check.status === "verified") ? "success" : "error"}>Storage: {checks.filter(check => check.status === "verified").length} verified · {checks.filter(check => check.status !== "verified").length} not verified. This checks existence, not file content or checksums.</UINotice>}
        {checks?.filter(check => check.status !== "verified").map(check => <p key={check.id} role="alert">{check.id}: {check.status} · {check.details}</p>)}
        <div style={{overflowX:"auto"}}>
          <table className="mm-audit-table">
            <thead><tr><th>Character</th><th>Slot</th><th>Total</th><th>Global</th><th>Legacy</th><th>Issues</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.characterId + row.slot}>
              <td>{row.characterId.includes("mara") ? "Mara" : "Lily"}</td>
              <td>{row.slot}</td><td>{row.total}</td><td>{row.global}</td><td>{row.legacy}</td>
              <td>{[row.total === 0 ? "Missing" : "",row.total > 1 ? "Multiple records" : "",row.duplicatePaths ? "Duplicate paths" : "",row.missingMetadata ? "Incomplete metadata" : ""].filter(Boolean).join(" · ") || "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <h2>Character references · Fresh start</h2>
        <UINotice>Room 714 / Arrival and its four shots are excluded. This cleanup only targets the six legacy Mara and Lily reference records. Back up your six original images before continuing.</UINotice>
        <UIButton onClick={() => void inspectDestinations()} disabled={inspectingDestinations || resetting}>{inspectingDestinations ? "Checking destinations…" : "Inspect old migration destinations"}</UIButton>
        {destinationChecks && <UINotice tone={destinationChecks.every(item => item.status === "empty") ? "success" : "error"}>Old migration destinations: {destinationChecks.filter(item => item.status === "empty").length} empty · {destinationChecks.filter(item => item.status === "present").length} existing · {destinationChecks.filter(item => item.status === "unverified").length} unverified. Any existing copy requires separate review.</UINotice>}
        <label style={{display:"flex",alignItems:"center",gap:8,marginTop:12,fontSize:11}}><input type="checkbox" checked={backupConfirmed} onChange={event => setBackupConfirmed(event.target.checked)}/> I have saved all six original reference images outside Model Motion.</label>
        <UIButton variant="secondary" disabled={!canReset} onClick={() => setConfirmReset(true)}>Remove six legacy references</UIButton>
        {!canReset && <UINotice>Cleanup locked until all six legacy references are identified, originals are backed up, and all six migration destinations are confirmed empty. No project or scene will be deleted.</UINotice>}
        {resetting && <UIProgress current={progress.done} total={progress.total} label="Removing legacy references"/>}
        {resetMessage && <UINotice tone={resetMessage.startsWith("Six legacy") ? "success" : "error"}>{resetMessage}</UINotice>}
        <UIConfirmDialog open={confirmReset} title="Delete six legacy reference files?" description="This permanently deletes six legacy Storage objects and their Firestore records. You confirmed that the original images are backed up. Room 714 / Arrival and its four shots are not affected." confirmLabel="Delete six legacy references" busy={resetting} onCancel={() => setConfirmReset(false)} onConfirm={() => void resetLegacyReferences()}/>
      </>}
    </div>
  </div>;
}
