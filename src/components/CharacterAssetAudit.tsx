import { copyCharacterReferences } from "../assets/copyMigration";
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
  const [confirmMigration, setConfirmMigration] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [migrationMessage, setMigrationMessage] = useState("");
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
  const candidates = preview.filter(item => item.status === "candidate");
  const ready = status === "ready" && !migrating && candidates.length > 0 && preview.length === 6 &&
    !assets.some(asset => asset.schemaVersion === 3 && asset.characterId && asset.owner?.kind === "character") &&
    preview.every(item => item.status === "candidate") &&
    rows.every(row => row.total === 1 && row.missingMetadata === 0 && row.duplicatePaths === 0) &&
    checks !== null && checks.length === 6 && checks.every(check => check.status === "verified");
  async function migrate() {
    if (!ready) return;
    setMigrating(true);
    setMigrationMessage("");
    try {
      const result = await copyCharacterReferences(assets, (done, total) => setProgress({ done, total }));
      setMigrationMessage(`${result.copied} verified copies registered. Original records and objects preserved. Refresh inventory to review global records.`);
      setConfirmMigration(false);
      await refresh();
    } catch (cause) {
      setMigrationMessage(cause instanceof Error ? cause.message : "Migration interrupted; originals remain unchanged.");
      setConfirmMigration(false);
    } finally { setMigrating(false); }
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
        <h2>F2.7 · Safe migration</h2>
        <p>Copy-first migration requires exactly six valid legacy references and a fresh successful Storage check. Originals are never deleted.</p>
        <UIButton variant="primary" disabled={!ready} onClick={() => setConfirmMigration(true)}>Review safe migration</UIButton>
        {!ready && <UINotice>Migration locked: verify all six Storage objects and ensure six candidate records with no conflicts.</UINotice>}
        {migrating && <UIProgress current={progress.done} total={progress.total} label="Copying and verifying references"/>}
        {migrationMessage && <UINotice tone={migrationMessage.includes("verified copies") ? "success" : "error"}>{migrationMessage}</UINotice>}
        <UIConfirmDialog open={confirmMigration} title="Copy six character references?" description="This creates verified copies and new Firestore records. Existing images and legacy records will remain untouched. Do not close this page during migration." confirmLabel="Copy and verify" busy={migrating} onCancel={() => setConfirmMigration(false)} onConfirm={() => void migrate()}/>
        <h2>F2.6 · Migration dry run</h2>
        <p>Preview only. No objects or metadata are changed. Destination existence is not checked unless already referenced by Firestore.</p>
        <p>{preview.filter(item => item.status === "candidate").length} candidates · {preview.filter(item => item.status === "already-global").length} global · {preview.filter(item => item.status === "conflict").length} conflicts · {preview.filter(item => item.status === "invalid").length} invalid</p>
        <div style={{overflowX:"auto"}}>
          <table className="mm-audit-table">
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
