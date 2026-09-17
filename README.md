# QuakeSLA

QuakeSLA turns reviewed USGS earthquake records into replay-resistant service-credit authorizations on GenLayer. It is designed for cloud, telecom, logistics, data-center and API providers whose contracts contain objective seismic force-majeure or regional-availability clauses.

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
- Legacy v1 contract: `0x7D2558EE3D6eA3c24dB5edD9D2CdC613C24e9659` (evidence archive only; the hardened API requires a new deployment)

The completed contract is [`contracts/quake_sla.py`](contracts/quake_sla.py). The previously deployed `USGSFetchProbe` is evidence that Studio Next validators can fetch and reach strict consensus over the selected USGS source; it is not the production QuakeSLA address.

## Lifecycle

1. **Create policy** — provider commits beneficiary, execution authority, service, region, magnitude, coverage window and geographic bounds.
2. **Assess event** — owner or beneficiary supplies only a constrained USGS event ID. The contract builds the fixed government endpoint.
3. **Validator judgment** — validators require an exact event identity, reviewed USGS status, earthquake type, bounded response and valid coordinates. They recompute every policy predicate.
4. **Fail closed** — missing, malformed, oversized, unreviewed or unavailable evidence becomes `UNRESOLVED`, never approval.
5. **Consume once** — only the bound execution authority can consume `READY`; revision checks reject stale calls and state prevents replay.

Coverage cannot be registered retroactively: its start must be in the future at creation time. Each policy also commits a canonical agreement ID, SHA-256 action digest, credit unit and maximum credit. Consumption must match that scope exactly.

## Contract API

| Method | Access | Purpose |
| --- | --- | --- |
| `create_policy(...)` | write | Pre-register a unique agreement, action digest, credit cap, parties and future coverage terms |
| `assess_event(policy_id, event_id, expected_revision)` | write | Fetch USGS and produce consensus receipt |
| `consume_authorization(policy_id, expected_revision, action_digest, credit_amount)` | write | One-time, scope-bound executor acknowledgement |
| `cancel_policy(policy_id, expected_revision)` | write | Owner cancellation before assessment |
| `get_policy(policy_id)` | view | Canonical policy/lifecycle JSON |
| `get_evidence(policy_id)` | view | Canonical USGS evidence receipt |
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

The direct suite covers approval, below-threshold denial, outside-window denial, outside-region denial, unreviewed fail-closed behavior, identity mismatch, URL/path injection rejection, stale revision rejection, unauthorized consumption, replay prevention, retroactive-policy rejection, duplicate-agreement rejection, action-digest mismatch and credit-cap enforcement. The current Windows `gltest` package cannot execute the Studio Next runner because its message codec predates that runner; do not replace the production dependency hash to make an outdated harness pass. Contract lint, frontend tests/build and live Studio Next checks remain reproducible now; run the direct suite when the matching runner lands in `gltest` or in the official Studio test environment.

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

- Deploy the hardened contract on Studio Next and replace the placeholder in `frontend/.env.example`.
- Require both accepted/finalized lifecycle **and** `FINISHED_WITH_RETURN`.
- Copy `frontend/.env.example` to the ignored `frontend/.env.local` after setting the new address.
- Legacy v1 approved and one-time consume branches are archived in `docs/LIVE_EVIDENCE.md`; rerun them against v2 before submission.
- Run at least one denied branch and one authorization/consume rejection.
- Rebuild the static frontend and deploy `frontend/out` to Cloudflare Pages.
- Record the mandatory demo video showing wallet connection, fee panel, consensus result and on-chain evidence explorer.

## Security notes

See [`docs/ADVERSARIAL_AUDIT.md`](docs/ADVERSARIAL_AUDIT.md) for the threat model and [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md) for a reviewer-ready flow.
Live source-access evidence is recorded in [`docs/LIVE_EVIDENCE.md`](docs/LIVE_EVIDENCE.md).
