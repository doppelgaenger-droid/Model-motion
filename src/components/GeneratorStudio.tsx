import { useState } from "react";
import { auth } from "../lib/firebase";
import { listCreativeAssets, type UploadedCreativeAsset } from "../assets/upload";

type Character = "mara" | "lily";
type Provider = "runpod" | "fal";
type GenerationResult = { jobId: string; status: "queued" | "processing" | "completed" | "failed"; imageUrl?: string; error?: string };

const CHARACTERS = {
  mara: { id: "character-mara-001", projectId: "room-714" },
  lily: { id: "character-lily-001", projectId: "lily" },
} as const;

/** This URL points to a server-side gateway; never expose provider API keys in Vite. */
const gatewayUrl = (import.meta.env.VITE_GENERATOR_GATEWAY_URL as string | undefined)?.replace(/\/$/, "");
const sogniCheckEuUrl = "https://europe-west1-model-motion.cloudfunctions.net/sogniCredentialCheckEu";
const coreEuUrl = "https://europe-west1-model-motion.cloudfunctions.net/modelMotionCoreEu";

async function gateway(path: string, body: Record<string, unknown>): Promise<GenerationResult> {
  if (!gatewayUrl) throw new Error("Generator backend is not configured (VITE_GENERATOR_GATEWAY_URL).");
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in to generate.");
  const response = await fetch(gatewayUrl + path, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json() as GenerationResult;
  if (!response.ok) throw new Error(data.error || "Generator request failed");
  return data;
}

export function GeneratorStudio() {
  const [character, setCharacter] = useState<Character>("mara");
  const [provider, setProvider] = useState<Provider>("runpod");
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [reference, setReference] = useState("");
  const [assets, setAssets] = useState<UploadedCreativeAsset[]>([]);
  const [status, setStatus] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [sogniCheckBusy, setSogniCheckBusy] = useState(false);
  const [sogniCheckResult, setSogniCheckResult] = useState("");
  const [draftTestBusy, setDraftTestBusy] = useState(false);
  const [draftTestResult, setDraftTestResult] = useState("");
  const identity = CHARACTERS[character];
  async function load(next: Character) {
    setCharacter(next); setReference(""); setStatus(null); setNotice("");
    try { setAssets(await listCreativeAssets({ kind:"character", id:CHARACTERS[next].id, projectId:CHARACTERS[next].projectId })); }
    catch (err) { setNotice(err instanceof Error ? err.message : String(err)); }
  }
  async function checkSogniCredentials() {
    if (sogniCheckBusy) return;
    setSogniCheckBusy(true);
    setSogniCheckResult("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in to verify Sogni credentials.");
      const token = await user.getIdToken();
      const response = await fetch(sogniCheckEuUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "credential-check" }),
      });
      const data: { credentialAccepted?: boolean; generationEnabled?: boolean; paidDispatchEnabled?: boolean; providerHttpStatus?: number; error?: string } = await response.json();
      if (!response.ok) {
        const detail = data.providerHttpStatus ? ` (provider HTTP ${data.providerHttpStatus})` : "";
        throw new Error(`${data.error || "Credential check failed"}${detail}. Check the EU Function logs if needed.`);
      }
      if (data.credentialAccepted === true && data.generationEnabled === false && data.paidDispatchEnabled === false) {
        setSogniCheckResult("Sogni credentials accepted in Belgium (europe-west1). Generation remains disabled; no paid job was started.");
      } else {
        throw new Error("Unexpected credential-check response. No generation was requested.");
      }
    } catch (error) {
      setSogniCheckResult(error instanceof Error ? error.message : "Credential check failed.");
    } finally {
      setSogniCheckBusy(false);
    }
  }
  async function testCoreDraft() {
    if (draftTestBusy) return;
    setDraftTestBusy(true);
    setDraftTestResult("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Sign in to test the private Core API.");
      const token = await user.getIdToken();
      const idempotencyKey = "test_" + crypto.randomUUID();
      const draft = {
        provider: "artcraft",
        characterId: identity.id,
        requestedBudgetUsd: 0.5,
        idempotencyKey,
      };
      const call = async (path: string, body: Record<string, unknown>) => {
        const response = await fetch(coreEuUrl + path, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json() as {
          created?: boolean; job?: { id: string; status: string; budgetCents: number };
          generationEnabled?: boolean; paidDispatchEnabled?: boolean; error?: string;
        };
        if (!response.ok) throw new Error(`${path}: ${data.error || "HTTP " + response.status}`);
        return data;
      };
      const first = await call("/jobs/draft", draft);
      if (!first.created || first.job?.status !== "draft" || first.job.budgetCents !== 50 ||
          first.generationEnabled !== false || first.paidDispatchEnabled !== false) {
        throw new Error("Draft creation returned unexpected data.");
      }
      const second = await call("/jobs/draft", draft);
      if (second.created !== false || second.job?.id !== first.job.id) {
        throw new Error("Idempotent replay produced unexpected data.");
      }
      const stored = await call("/jobs/get", { jobId: first.job.id });
      if (stored.job?.id !== first.job.id || stored.job.status !== "draft" ||
          stored.generationEnabled !== false || stored.paidDispatchEnabled !== false) {
        throw new Error("Persisted draft check failed.");
      }
      setDraftTestResult("EU Core test passed: one draft saved and retrieved, repeat request reused its ID. No generation or provider call. Draft ID: " + first.job.id);
    } catch (error) {
      setDraftTestResult(error instanceof Error ? error.message : "EU Core draft test failed.");
    } finally {
      setDraftTestBusy(false);
    }
  }
  function generate() {
    // Disabled until trusted budget and privacy authorization is enforced server-side.
    setNotice("Direct generation is paused until the budget-enforced Generation Router is ready.");
  }
  async function refresh() {
    if (!status?.jobId) return;
    setLoading(true);
    try { setStatus(await gateway("/status", { jobId:status.jobId })); }
    catch (err) { setNotice(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }
  return <div className="studio" style={{padding:24}}>
    <div className="studio-head"><div><small>LIBRARY TOOLS / PRIVATE</small><h1>Generator Studio</h1></div><div className="head-meta"><span>API prototype</span><span>Integration candidate</span></div></div>
    <p>Remote generation is paused pending server-side cost, privacy and provider authorization. Existing canonical references remain available in the Character Library.</p>
    <div style={{display:"grid",gap:16,maxWidth:720}}>
      <label>Character<select value={character} onChange={e=>void load(e.target.value as Character)}><option value="mara">Mara</option><option value="lily">Lily</option></select></label>
      <label>Provider<select value={provider} onChange={e=>setProvider(e.target.value as Provider)}><option value="runpod">RunPod · custom endpoint</option><option value="fal">fal.ai · configured model</option></select></label>
      <button type="button" onClick={()=>void load(character)}>Load available references</button>
      <label>Identity reference<select value={reference} onChange={e=>setReference(e.target.value)}><option value="">No reference selected</option>{assets.filter(a=>a.type==="identity-reference"||a.type==="full-body-reference"||a.type==="character-board").map(a=><option value={a.id} key={a.id}>{a.type} · {a.name}</option>)}</select></label>
      <label>Image description<textarea rows={5} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Pose, camera, lighting, outfit, setting…" /></label>
      <label>Negative prompt<textarea rows={2} value={negative} onChange={e=>setNegative(e.target.value)} placeholder="Optional exclusions…" /></label>
      <button className="primary-action" disabled onClick={()=>void generate()}>{"Generation paused · budget router pending"}</button>
      <section aria-label="Sogni EU credential verification" style={{border:"1px solid var(--border, #555)",padding:16,display:"grid",gap:8}}>
        <strong>Sogni · EU credential check</strong>
        <p>Read-only API credential verification in Belgium. Does not generate images, videos, or paid jobs.</p>
        <button type="button" disabled={sogniCheckBusy} onClick={()=>void checkSogniCredentials()}>{sogniCheckBusy ? "Verifying…" : "Verify Sogni credentials · EU"}</button>
        {sogniCheckResult && <p role="status" aria-live="polite">{sogniCheckResult}</p>}
      </section>
      <section aria-label="EU Core draft persistence test" style={{border:"1px solid var(--border, #555)",padding:16,display:"grid",gap:8}}>
        <strong>Model Motion Core · EU draft test</strong>
        <p>Creates a single test draft in European Firestore, checks idempotency and reads it back. No reference upload, generation or paid API call.</p>
        <button type="button" disabled={draftTestBusy} onClick={()=>void testCoreDraft()}>{draftTestBusy ? "Testing…" : "Test EU draft persistence"}</button>
        {draftTestResult && <p role="status" aria-live="polite" style={{overflowWrap:"anywhere"}}>{draftTestResult}</p>}
      </section>
      {!gatewayUrl && <p role="status">Backend not connected. Configure VITE_GENERATOR_GATEWAY_URL to enable generation.</p>}
      {notice && <p role="alert">{notice}</p>}
      {status && <section aria-live="polite"><b>Job {status.jobId}</b><p>Status: {status.status}</p>{status.imageUrl && <img alt="Generated reference" src={status.imageUrl} style={{maxWidth:"100%",maxHeight:560,objectFit:"contain"}} />}{status.error && <p role="alert">{status.error}</p>}{(status.status==="queued"||status.status==="processing")&&<button disabled={loading} onClick={()=>void refresh()}>Refresh status</button>}</section>}
    </div>
  </div>;
}
