# QuakeSLA v3 — USGS Revalidation & Evidence Drift Control

## Outcome

This milestone prevents an initial reviewed USGS response from becoming immediately executable. A qualifying first assessment now enters `PENDING_CONFIRMATION`. After a fixed six-hour delay, validators must fetch the same event again before the policy can become `READY`.

## Material contract changes

- Added `PENDING_CONFIRMATION` between initial approval and authorization readiness.
- Added `confirm_event(policy_id, expected_revision)` with policy-party access, revision protection and a deterministic six-hour delay.
- Persisted the initial and confirmation receipts separately.
- Added explicit drift classifications: unchanged, non-material source change, material change still eligible, no longer eligible, and unresolved confirmation.
- A corrected event that no longer matches returns the policy to `ACTIVE` without creating an authorization.
- `consume_authorization` remains restricted to `READY`, so no execution is possible before the second validator consensus.
- Added `get_evidence_history` for public audit of both receipts, confirmation attempts, timestamps and drift.

## Frontend improvements

- Added a dedicated `Confirm USGS evidence` transaction flow.
- Added a countdown and exact on-chain confirmation eligibility time.
- Expanded the lifecycle timeline to show initial assessment, revalidation, readiness and consumption separately.
- Added side-by-side receipt comparison for magnitude, event time, coordinates, reviewed status and SHA-256.
- Added visible drift classification and changed-field reporting.
- Added regression tests for confirmation gating, countdowns and receipt comparison.

## Security properties

1. Initial approval cannot be consumed.
2. Confirmation cannot execute before the on-chain delay.
3. Confirmation is locked to the original USGS event ID.
4. A correction below the SLA threshold revokes the candidate authorization.
5. Material changes that remain eligible are not hidden; they are classified and retained.
6. Source failure during confirmation fails closed and leaves the policy non-executable.
7. Existing executor, scope, credit-cap, revision and replay controls remain intact.

## Local verification

```text
Python syntax compilation: passed
GenVM static lint:         passed (3 checks)
Frontend TypeScript:       passed
Frontend tests:            17 passed
Next.js static build:      passed
```

The Windows Direct Mode package currently fails while loading its own GenLayer message codec (`unexpected end of memory`) before contract deployment. This is the already-documented runner mismatch, not a contract assertion failure. The expanded 19-test Direct Mode suite is committed for execution with the matching Studio runner.

## Deployment gate

This release changes storage and ABI and therefore requires a new Studio Next contract. Do not point the production frontend at v3 until deployed source parity, initial assessment, early-confirmation rejection, delayed confirmation, `READY`, consumption and replay rejection are verified on the new address.
