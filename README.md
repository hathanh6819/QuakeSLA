# QuakeSLA

QuakeSLA turns twice-verified USGS earthquake records into replay-resistant service-credit authorizations on GenLayer. It is designed for cloud, telecom, logistics, data-center and API providers whose contracts contain objective seismic force-majeure or regional-availability clauses.

The contract does **not** transfer funds and does not accept a caller-provided verdict. It binds the parties and policy terms first, then every validator independently fetches the canonical USGS event record and recomputes whether the event satisfies the committed time window, geographic bounding box and magnitude threshold. A separately bound execution authority may consume an approved authorization once.

## Why GenLayer

USGS is the evidence authority, but it does not know the terms of a private SLA. A normal smart contract cannot fetch and interpret the live record. A centralized backend could do so, but becomes the sole adjudicator. GenLayer validators independently retrieve the source, normalize the same fields and reach strict equivalence over a canonical receipt.

```text
USGS reviewed event ──► validator-local fetch + policy recomputation
                                      │
                                      ▼
                          exact canonical evidence receipt
                                      │
                     APPROVED / DENIED / UNRESOLVED
                                      │
                                      ▼
                    bound executor consumes once (no payment)
```

Judgment authority and execution authority are deliberately separate. QuakeSLA proves that an action is authorized; billing or payment rails decide how to execute it.

## Studio Next deployment target

- Network: Studio Next / Studio Dev
- RPC: `https://studio-next.genlayer.com/api`
- Chain ID: `61997`
- Runner: `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`
- Explorer: <https://explorer-studio-dev.genlayer.com/>
- Legacy lifecycle contract: `0x7D2558EE3D6eA3c24dB5edD9D2CdC613C24e9659`
- Audited pre-final contract: `0x177dc3165Af4fd29c1cFD356e7895130Be04A399` (live denial/unresolved evidence only; final source adds non-terminal denials, post-start cancellation protection and consumed-amount accounting)
- Final hardened contract: `0xaE660255E845d506a012C3b6540cA9E48995F24b`
- v3 revalidation candidate: `0xafc7939909Af844DEa6431EB3A46fDe7D7f9C713` (exact source parity verified; lifecycle pending)

The completed contract is [`contracts/quake_sla.py`](contracts/quake_sla.py). The previously deployed `USGSFetchProbe` is evidence that Studio Next validators can fetch and reach strict consensus over the selected USGS source; it is not the production QuakeSLA address.

## Lifecycle

1. **Create policy** — provider commits beneficiary, execution authority, service, region, magnitude, coverage window and geographic bounds.
2. **Assess event** — owner or beneficiary supplies only a constrained USGS event ID. The contract builds the fixed government endpoint.
3. **Initial validator judgment** — validators require an exact event identity, reviewed USGS status, earthquake type, bounded response and valid coordinates. A qualifying event becomes `PENDING_CONFIRMATION`, not immediately executable.
4. **Delayed revalidation** — after six hours, validators fetch the same USGS event again. Both receipts and any material drift remain on-chain; corrected evidence can revoke the candidate authorization.
5. **Fail closed** — missing, malformed, oversized, unreviewed or unavailable evidence never produces `READY`. A valid but non-matching event records `DENIED` without destroying coverage for later events.
6. **Consume once** — only the bound execution authority can consume an authorization that passed both assessments; revision checks reject stale calls and state prevents replay.

Coverage cannot be registered retroactively: its start must be in the future at creation time. Each policy also commits a canonical agreement ID, SHA-256 action digest, credit unit and maximum credit. Consumption must match that scope exactly.

## Contract API

| Method | Access | Purpose |
| --- | --- | --- |
| `create_policy(...)` | write | Pre-register a unique agreement, action digest, credit cap, parties and future coverage terms |
| `assess_event(policy_id, event_id, expected_revision)` | write | Fetch USGS and produce consensus receipt |
| `confirm_event(policy_id, expected_revision)` | write | Re-fetch the same event after the finality delay and detect evidence drift |
| `consume_authorization(policy_id, expected_revision, action_digest, credit_amount)` | write | One-time, scope-bound executor acknowledgement |
| `cancel_policy(policy_id, expected_revision)` | write | Owner cancellation only before coverage starts |
| `get_policy(policy_id)` | view | Canonical policy/lifecycle JSON |
| `get_evidence(policy_id)` | view | Canonical USGS evidence receipt |
| `get_evidence_history(policy_id)` | view | Initial and confirmation receipts, delay, attempts and drift classification |
| `get_policy_count()` | view | Number of registered policies |

## Local verification

```bash
python -m pip install -r requirements.txt
genvm-lint contracts/quake_sla.py
python -m pytest tests/direct/test_quake_sla.py -v  # compatible Studio Next SDK runner required
npm install
npm test
npm run lint
npm run build
```

The direct suite additionally covers early-confirmation rejection, stable revalidation, eligibility-revoking drift and material drift that remains eligible. The current Windows `gltest` package cannot execute the Studio Next runner because its message codec predates that runner; do not replace the production dependency hash to make an outdated harness pass. Contract lint, frontend tests/build and live Studio Next checks remain reproducible now; run the direct suite when the matching runner lands in `gltest` or in the official Studio test environment.

## Frontend

The frontend is a custom Next.js interface with no mock policy data or simulated fallback. All explorer values come from `get_policy_count`, `get_policy` and `get_evidence`; all writes use Transaction Kit RC2 and expose live fee estimation and lifecycle tracking.

```bash
copy frontend\.env.example frontend\.env.local
# set NEXT_PUBLIC_CONTRACT_ADDRESS after deploying QuakeSLA
npm install
npm run dev
```

Static export for Cloudflare Pages is written to `frontend/out` by `npm run build`.

## Evidence source

The only runtime evidence origin is the USGS Earthquake Hazards Program detail feed:

`https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/{event_id}.geojson`

The caller cannot provide a hostname, path, scheme or verdict. Event identifiers are length and character constrained before the fixed URL is constructed.

## Deployment checklist

> Protocol v3 changes storage and ABI. The production frontend must remain on the verified v2 address until v3 is deployed and its two-fetch lifecycle is proven live.

- Use the final Studio Next address already recorded in `frontend/.env.example`.
- Require both accepted/finalized lifecycle **and** `FINISHED_WITH_RETURN`.
- Copy `frontend/.env.example` to the ignored `frontend/.env.local` after setting the new address.
- Final v2 approved, one-time consume and replay-rejection transactions are recorded in `docs/LIVE_EVIDENCE.md`.
- Run at least one denied branch and one authorization/consume rejection.
- Rebuild the static frontend and deploy `frontend/out` to Cloudflare Pages.
- Record the mandatory demo video showing wallet connection, fee panel, consensus result and on-chain evidence explorer.

## Security notes

See [`docs/ADVERSARIAL_AUDIT.md`](docs/ADVERSARIAL_AUDIT.md) for the threat model and [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md) for a reviewer-ready flow.
Live source-access evidence is recorded in [`docs/LIVE_EVIDENCE.md`](docs/LIVE_EVIDENCE.md).
