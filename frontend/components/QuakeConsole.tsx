"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, BadgeCheck, Braces, CheckCircle2, CircleAlert,
  CloudLightning, ExternalLink, FileCheck2, Gauge, Globe2, Loader2,
  LockKeyhole, MapPin, Radar, RefreshCw, ShieldCheck, Sparkles, Wallet,
  Waves, X, Zap,
} from "lucide-react";
import {
  GenLayerTransactionPanel,
  type SubmitInput,
  type TrackedStatus,
} from "@genlayer/transaction-kit-react";
import { GENLAYER_NETWORK, getContractAddress } from "@/lib/genlayer/client";
import { useWallet } from "@/lib/genlayer/wallet";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { usePolicy, usePolicyCount, useRefreshQuakeData } from "@/lib/hooks/useQuakeSLA";
import { toast } from "sonner";

const short = (value?: string | null) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Not connected";
const toMs = (value: string) => new Date(value).getTime();
const dateInput = (offsetDays: number) => {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return date.toISOString().slice(0, 16);
};

function StatusPill({ status }: { status?: string }) {
  const tone = status === "READY" || status === "APPROVED" ? "good" : status === "DENIED" || status === "CANCELLED" ? "bad" : status === "UNRESOLVED" ? "warn" : "neutral";
  return <span className={`status-pill ${tone}`}><span className="status-dot" />{status || "UNASSESSED"}</span>;
}

function Metric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return <div className="metric-card">
    <div className={`metric-icon ${accent ? "accent" : ""}`}>{icon}</div>
    <div><p>{label}</p><strong>{value}</strong></div>
  </div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function QuakeConsole() {
  const wallet = useWallet();
  const kit = useTransactionKit(wallet.address);
  const contractAddress = getContractAddress();
  const refresh = useRefreshQuakeData();
  const count = usePolicyCount();
  const [lookupId, setLookupId] = useState(1);
  const record = usePolicy(lookupId);
  const [flow, setFlow] = useState<"create" | "assess" | "consume" | null>(null);
  const [beneficiary, setBeneficiary] = useState("");
  const [executor, setExecutor] = useState("");
  const [agreementId, setAgreementId] = useState("SLA-2026-001");
  const [actionDigest, setActionDigest] = useState("");
  const [creditUnit, setCreditUnit] = useState("USD_CENTS");
  const [maxCredit, setMaxCredit] = useState("10000");
  const [service, setService] = useState("API availability credit");
  const [region, setRegion] = useState("Western United States");
  const [magnitude, setMagnitude] = useState("4.5");
  const [start, setStart] = useState(dateInput(1));
  const [end, setEnd] = useState(dateInput(30));
  const [bounds, setBounds] = useState({ minLat: "24", maxLat: "50", minLon: "-126", maxLon: "-65" });
  const [assessId, setAssessId] = useState("1");
  const [eventId, setEventId] = useState("us7000thsp");
  const [revision, setRevision] = useState("1");
  const [consumeId, setConsumeId] = useState("1");
  const [consumeRevision, setConsumeRevision] = useState("2");
  const [consumeDigest, setConsumeDigest] = useState("");
  const [consumeAmount, setConsumeAmount] = useState("10000");

  useEffect(() => {
    if (wallet.address) {
      setBeneficiary((v) => v || wallet.address!);
      setExecutor((v) => v || wallet.address!);
    }
  }, [wallet.address]);

  const createTx = useMemo<SubmitInput>(() => ({
    kind: "write",
    address: contractAddress as `0x${string}`,
    method: "create_policy",
    args: [
      agreementId.trim(), actionDigest.trim().toLowerCase(), creditUnit.trim().toUpperCase(), Number(maxCredit),
      beneficiary.trim(), executor.trim(), service.trim(), region.trim(),
      Math.round(Number(magnitude) * 10), toMs(start), toMs(end),
      Math.round(Number(bounds.minLat) * 10000), Math.round(Number(bounds.maxLat) * 10000),
      Math.round(Number(bounds.minLon) * 10000), Math.round(Number(bounds.maxLon) * 10000),
    ],
  }), [agreementId, actionDigest, creditUnit, maxCredit, beneficiary, executor, service, region, magnitude, start, end, bounds, contractAddress]);

  const assessTx = useMemo<SubmitInput>(() => ({
    kind: "write", address: contractAddress as `0x${string}`, method: "assess_event",
    args: [Number(assessId), eventId.trim(), Number(revision)],
  }), [contractAddress, assessId, eventId, revision]);

  const consumeTx = useMemo<SubmitInput>(() => ({
    kind: "write", address: contractAddress as `0x${string}`, method: "consume_authorization",
    args: [Number(consumeId), Number(consumeRevision), consumeDigest.trim().toLowerCase(), Number(consumeAmount)],
  }), [contractAddress, consumeId, consumeRevision, consumeDigest, consumeAmount]);

  const requireReady = (event: FormEvent, next: typeof flow) => {
    event.preventDefault();
    if (!contractAddress) return toast.error("Contract address is not configured");
    if (!wallet.isConnected) return toast.error("Connect your wallet first");
    if (!kit) return toast.error("Transaction Kit is not ready");
    setFlow(next);
  };

  const done = (label: string) => (status: TrackedStatus) => {
    if (status.successful === false) return toast.error(`${label} did not finish successfully`);
    toast.success(`${label} confirmed by GenLayer consensus`);
    setFlow(null); refresh();
  };

  return <>
    <header className="topbar">
      <a href="#top" className="brand" aria-label="QuakeSLA home">
        <span className="brand-mark"><Waves size={23} /></span>
        <span><strong>QuakeSLA</strong><small>Verifiable service credits</small></span>
      </a>
      <nav><a href="#workflow">Workflow</a><a href="#console">Console</a><a href="#evidence">Evidence</a></nav>
      <button className="wallet-button" onClick={() => wallet.isConnected ? wallet.disconnectWallet() : wallet.connectWallet()}>
        <span className={wallet.isConnected ? "online" : "offline"} />
        <Wallet size={16} /> {wallet.isLoading ? "Checking…" : wallet.isConnected ? short(wallet.address) : "Connect wallet"}
      </button>
    </header>

    <main id="top">
      <section className="hero">
        <div className="hero-visual" aria-hidden="true"><div className="hero-scan" /></div>
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={14} /> PARAMETRIC SLA JUDGMENT ON GENLAYER</div>
          <h1>When the ground moves,<br /><em>settlement shouldn&apos;t.</em></h1>
          <p>Turn reviewed USGS earthquake evidence into a deterministic, one-time service-credit authorization—validated independently by GenLayer&apos;s consensus network.</p>
          <div className="hero-actions"><a className="primary-action" href="#console">Launch console <ArrowRight size={17} /></a><a className="ghost-action" href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php" target="_blank">View USGS source <ExternalLink size={15} /></a></div>
          <div className="trust-row"><span><CheckCircle2 /> Authoritative evidence</span><span><CheckCircle2 /> 5-validator consensus</span><span><CheckCircle2 /> One-time execution</span></div>
        </div>
      </section>

      <section className="metrics-strip">
        <Metric icon={<Radar />} label="Evidence authority" value="USGS GeoJSON" accent />
        <Metric icon={<ShieldCheck />} label="Network" value="Studio Next · 61997" />
        <Metric icon={<FileCheck2 />} label="Policies on-chain" value={count.isLoading ? "—" : String(count.data ?? 0)} />
        <Metric icon={<LockKeyhole />} label="Execution model" value="Explicit consume" />
      </section>

      <section id="workflow" className="section-shell">
        <div className="section-heading"><div><span>HOW IT WORKS</span><h2>Evidence to authorization, without an oracle.</h2></div><p>The contract never trusts a user-supplied verdict. Each validator independently fetches the same bounded USGS endpoint and recomputes the policy match.</p></div>
        <div className="workflow-grid">
          {[
            ["01", <Braces key="i" />, "Bind the SLA", "Provider, beneficiary and billing executor commit the coverage window, magnitude threshold and geographic bounding box."],
            ["02", <Globe2 key="i" />, "Fetch canonical evidence", "A party submits only a USGS event ID. Validators construct the fixed government endpoint; arbitrary URLs are rejected by design."],
            ["03", <Activity key="i" />, "Recompute the match", "Reviewed status, timestamp, coordinates and magnitude are normalized into an exact canonical receipt under strict equivalence."],
            ["04", <BadgeCheck key="i" />, "Consume once", "Only the bound execution authority can consume an approved authorization, preventing replay and separating judgment from payment."],
          ].map(([n, icon, title, text]) => <article className="workflow-card" key={String(n)}><span className="step-number">{n}</span><div className="workflow-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section id="console" className="console-section section-shell">
        <div className="section-heading compact"><div><span>LIVE CONTRACT CONSOLE</span><h2>Operate the full lifecycle.</h2></div><div className="contract-chip"><span className={contractAddress ? "online" : "offline"} />{contractAddress ? short(contractAddress) : "Address required"}</div></div>
        <div className="console-grid">
          <div className="action-stack">
            <article className="console-card featured">
              <div className="card-title"><span><Zap /> Create coverage policy</span><small>Step 1</small></div>
              {flow === "create" && kit ? <TransactionReview onBack={() => setFlow(null)} kit={kit} tx={createTx} onDone={done("Policy creation")} /> :
              <form className="form-grid" onSubmit={(e) => requireReady(e, "create")}>
                <Field label="Canonical agreement ID"><input value={agreementId} onChange={e => setAgreementId(e.target.value)} required /></Field>
                <Field label="Authorized action digest" hint="sha256: followed by 64 lowercase hex characters"><input value={actionDigest} onChange={e => setActionDigest(e.target.value)} pattern="sha256:[0-9a-f]{64}" required /></Field>
                <Field label="Credit unit"><input value={creditUnit} onChange={e => setCreditUnit(e.target.value)} required /></Field>
                <Field label="Maximum credit"><input type="number" min="1" step="1" value={maxCredit} onChange={e => setMaxCredit(e.target.value)} required /></Field>
                <Field label="Beneficiary wallet"><input value={beneficiary} onChange={e => setBeneficiary(e.target.value)} required /></Field>
                <Field label="Execution authority"><input value={executor} onChange={e => setExecutor(e.target.value)} required /></Field>
                <Field label="Covered service"><input value={service} onChange={e => setService(e.target.value)} required /></Field>
                <Field label="Region label"><input value={region} onChange={e => setRegion(e.target.value)} required /></Field>
                <Field label="Minimum magnitude"><input type="number" min="1" max="10" step="0.1" value={magnitude} onChange={e => setMagnitude(e.target.value)} required /></Field>
                <Field label="Coverage starts"><input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required /></Field>
                <Field label="Coverage ends"><input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required /></Field>
                <div className="bbox-fields">
                  <Field label="Min latitude"><input type="number" step="0.0001" value={bounds.minLat} onChange={e => setBounds({...bounds, minLat:e.target.value})} /></Field>
                  <Field label="Max latitude"><input type="number" step="0.0001" value={bounds.maxLat} onChange={e => setBounds({...bounds, maxLat:e.target.value})} /></Field>
                  <Field label="Min longitude"><input type="number" step="0.0001" value={bounds.minLon} onChange={e => setBounds({...bounds, minLon:e.target.value})} /></Field>
                  <Field label="Max longitude"><input type="number" step="0.0001" value={bounds.maxLon} onChange={e => setBounds({...bounds, maxLon:e.target.value})} /></Field>
                </div>
                <button className="submit-button" type="submit">Review policy transaction <ArrowRight /></button>
              </form>}
            </article>

            <div className="two-col-actions">
              <article className="console-card">
                <div className="card-title"><span><Radar /> Assess USGS event</span><small>Step 2</small></div>
                {flow === "assess" && kit ? <TransactionReview onBack={() => setFlow(null)} kit={kit} tx={assessTx} onDone={done("Event assessment")} /> :
                <form className="small-form" onSubmit={(e) => requireReady(e, "assess")}>
                  <div className="inline-fields"><Field label="Policy ID"><input type="number" min="1" value={assessId} onChange={e=>setAssessId(e.target.value)} /></Field><Field label="Expected revision"><input type="number" min="1" value={revision} onChange={e=>setRevision(e.target.value)} /></Field></div>
                  <Field label="USGS event ID" hint="Example verified live event: us7000thsp"><input value={eventId} onChange={e=>setEventId(e.target.value)} /></Field>
                  <button className="submit-button secondary" type="submit">Run validator assessment <Activity /></button>
                </form>}
              </article>
              <article className="console-card">
                <div className="card-title"><span><LockKeyhole /> Consume authorization</span><small>Step 3</small></div>
                {flow === "consume" && kit ? <TransactionReview onBack={() => setFlow(null)} kit={kit} tx={consumeTx} onDone={done("Authorization consumption")} /> :
                <form className="small-form" onSubmit={(e) => requireReady(e, "consume")}>
                  <div className="inline-fields"><Field label="Policy ID"><input type="number" min="1" value={consumeId} onChange={e=>setConsumeId(e.target.value)} /></Field><Field label="Expected revision"><input type="number" min="1" value={consumeRevision} onChange={e=>setConsumeRevision(e.target.value)} /></Field></div>
                  <Field label="Action digest" hint="Must exactly match the policy scope"><input value={consumeDigest} onChange={e=>setConsumeDigest(e.target.value)} pattern="sha256:[0-9a-f]{64}" required /></Field>
                  <Field label="Credit amount"><input type="number" min="1" step="1" value={consumeAmount} onChange={e=>setConsumeAmount(e.target.value)} required /></Field>
                  <div className="safety-note"><ShieldCheck /><span>Only the wallet bound as execution authority can perform this irreversible one-time action.</span></div>
                  <button className="submit-button secondary" type="submit">Consume approved credit <BadgeCheck /></button>
                </form>}
              </article>
            </div>
          </div>

          <aside id="evidence" className="evidence-panel">
            <div className="panel-header"><div><span>ON-CHAIN EXPLORER</span><h3>Policy evidence</h3></div><button onClick={() => {refresh(); void record.refetch();}} aria-label="Refresh"><RefreshCw size={16} className={record.isFetching ? "spin" : ""} /></button></div>
            <div className="lookup"><input type="number" min="1" value={lookupId} onChange={e=>setLookupId(Number(e.target.value))} /><button onClick={()=>void record.refetch()}>Load</button></div>
            {record.isLoading ? <div className="empty-state"><Loader2 className="spin" /><p>Reading verified state…</p></div> : record.isError ? <div className="empty-state"><CircleAlert /><p>Policy #{lookupId} is not available yet.</p></div> : record.data ? <>
              <div className="policy-head"><div><small>POLICY #{record.data.policy.policy_id}</small><h4>{record.data.policy.service}</h4><p><MapPin /> {record.data.policy.region}</p></div><StatusPill status={record.data.policy.status} /></div>
              <div className="evidence-metrics"><div><span>Threshold</span><strong>M {(record.data.policy.min_magnitude_tenths/10).toFixed(1)}+</strong></div><div><span>Revision</span><strong>{record.data.policy.revision}</strong></div><div><span>Max credit</span><strong>{record.data.policy.max_credit} {record.data.policy.credit_unit}</strong></div></div>
              <div className="receipt muted"><dl><div><dt>Agreement</dt><dd>{record.data.policy.agreement_id}</dd></div><div><dt>Action digest</dt><dd className="mono">{record.data.policy.action_digest}</dd></div></dl></div>
              <div className="timeline"><div className="done"><i /><span>Policy bound<small>Terms committed on-chain</small></span></div><div className={record.data.policy.verdict !== "UNASSESSED" ? "done" : ""}><i /><span>Evidence assessed<small>{record.data.policy.event_id || "Awaiting USGS event"}</small></span></div><div className={record.data.policy.status === "READY" || record.data.policy.status === "CONSUMED" ? "done" : ""}><i /><span>Authorization ready<small>Strict validator equivalence</small></span></div><div className={record.data.policy.status === "CONSUMED" ? "done" : ""}><i /><span>Consumed once<small>{record.data.policy.consumed_by ? `${record.data.policy.consumed_amount} ${record.data.policy.credit_unit} by ${short(record.data.policy.consumed_by)}` : "Execution authority only"}</small></span></div></div>
              {record.data.evidence ? <div className="receipt"><div className="receipt-title"><span><FileCheck2 /> Canonical receipt</span><StatusPill status={record.data.evidence.verdict || record.data.evidence.kind} /></div><dl><div><dt>Reason</dt><dd>{record.data.evidence.reason}</dd></div>{record.data.evidence.place && <div><dt>Place</dt><dd>{record.data.evidence.place}</dd></div>}{record.data.evidence.magnitude_tenths != null && <div><dt>Magnitude</dt><dd>{(record.data.evidence.magnitude_tenths/10).toFixed(1)}</dd></div>}{record.data.evidence.sha256 && <div><dt>Evidence digest</dt><dd className="mono">{record.data.evidence.sha256}</dd></div>}</dl>{record.data.evidence.source && <a href={record.data.evidence.source} target="_blank">Open authoritative record <ExternalLink /></a>}</div> : <div className="receipt muted"><CloudLightning /><p>No evidence receipt yet. Submit a reviewed USGS event ID to start consensus.</p></div>}
            </> : null}
          </aside>
        </div>
      </section>

      <section className="proof-section section-shell"><div className="proof-copy"><span>WHY DECENTRALIZED JUDGMENT?</span><h2>A source can be public and still need consensus.</h2><p>USGS supplies facts, not your SLA outcome. QuakeSLA makes every validator independently prove that the same reviewed event satisfies the exact policy window, magnitude and geographic scope before authorization can exist.</p><div className="proof-list"><div><CheckCircle2 /><span><strong>No arbitrary evidence URLs</strong>Event IDs are constrained and expanded into a fixed USGS endpoint.</span></div><div><CheckCircle2 /><span><strong>Fail closed under uncertainty</strong>Unavailable, malformed or unreviewed evidence becomes UNRESOLVED—not approval.</span></div><div><CheckCircle2 /><span><strong>Replay-resistant lifecycle</strong>Revisions protect stale calls and authorization can be consumed exactly once.</span></div></div></div><div className="seismic-card"><div className="seismic-top"><span>VALIDATOR AGREEMENT</span><strong>3 / 5 quorum</strong></div><div className="wave-line"><svg viewBox="0 0 640 150" preserveAspectRatio="none"><path d="M0 78 L95 78 L112 76 L124 50 L136 115 L149 18 L162 132 L177 62 L191 87 L210 76 L263 78 L276 68 L287 95 L302 36 L315 113 L330 54 L345 86 L361 75 L410 78 L423 70 L438 101 L451 43 L465 107 L480 61 L494 83 L510 77 L640 78" /></svg></div><div className="validator-row">{[1,2,3,4,5].map((v,i)=><div className={i<3?"active":""} key={v}><span>V{v}</span><small>{i<3?"AGREE":"IDLE"}</small></div>)}</div></div></section>
    </main>
    <footer><div className="brand compact"><span className="brand-mark"><Waves size={18}/></span><span><strong>QuakeSLA</strong></span></div><p>Authoritative seismic evidence. Decentralized judgment. Explicit execution.</p><div><a href="https://studio-next.genlayer.com" target="_blank">Studio Next</a><a href="https://docs.genlayer.com" target="_blank">Docs</a><a href="https://earthquake.usgs.gov" target="_blank">USGS</a></div></footer>
  </>;
}

function TransactionReview({ kit, tx, onDone, onBack }: { kit: NonNullable<ReturnType<typeof useTransactionKit>>; tx: SubmitInput; onDone: (status: TrackedStatus) => void; onBack: () => void }) {
  return <div className="transaction-review"><button className="back-button" onClick={onBack}><X /> Close review</button><GenLayerTransactionPanel kit={kit} tx={tx} network={GENLAYER_NETWORK.chainName} theme="dark" trackUntil="finalized" onDone={onDone} /></div>;
}
