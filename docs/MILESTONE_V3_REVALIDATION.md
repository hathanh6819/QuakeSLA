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

## Production status

The v3 contract has exact deployed-source parity and the complete two-wallet lifecycle is finalized on Studio Next. The production frontend is configured for this address.

## Live candidate

- Contract: [`0xafc7939909Af844DEa6431EB3A46fDe7D7f9C713`](https://explorer-studio-dev.genlayer.com/address/0xafc7939909Af844DEa6431EB3A46fDe7D7f9C713)
- Exact deployed/local source SHA-256: `8f51ded9eeb467c24d4ecd3e71a4eb33cd446367cbddfc7b3791a35753f30782`
- Policy creation: [`0x97b320…897c3`](https://explorer-studio-dev.genlayer.com/tx/0x97b320c95664bf51a367efc625c2debe1e19440e6e260d4244d25a8adb9897c3)
- Result: `FINALIZED / FINISHED_WITH_RETURN / MAJORITY_AGREE`
- Policy #1: `ACTIVE`, revision `1`; coverage begins at `1792226866985` ms.

### Initial assessment

A real reviewed earthquake occurred after coverage began:

- USGS event: [`us6000u2z9`](https://earthquake.usgs.gov/earthquakes/eventpage/us6000u2z9)
- Event: M4.8, 110 km NE of Norsup, Vanuatu, event time `1792227591583` ms.
- Assessment: [`0xa80b73…59af6`](https://explorer-studio-dev.genlayer.com/tx/0xa80b73c8e7188944283db474233bbe3ae790cfc92a9f5c38362eb9a3adc59af6)
- Result: `FINALIZED / FINISHED_WITH_RETURN / MAJORITY_AGREE`
- State: `PENDING_CONFIRMATION`, revision `2`, drift `AWAITING_REVALIDATION`.
- Initial receipt SHA-256: `e86684c489bd39a11a2b380c171ac026e751349594a195d6aed3c0f6ac1e492c`.
- Confirmation becomes eligible at `1792250803876` ms (2026-10-17 22:26:43 UTC+7).
- A fee-free `confirm_event(1, 2)` simulation before that time failed with `REVALIDATION_DELAY_ACTIVE`, proving the delay gate.

### Delayed confirmation and execution

After the on-chain delay elapsed, validators independently fetched the same event again. All material fields remained identical; only the response-body digest changed, so the contract transparently classified the result as `NON_MATERIAL_SOURCE_CHANGE`.

| Check | Transaction / simulation | Verified outcome |
| --- | --- | --- |
| Delayed `confirm_event(1, 2)` | [`0xd0ace9…71802`](https://explorer-studio-dev.genlayer.com/tx/0xd0ace9a3d0035d4f15720bb14ebe3ada419288da7dd219bc4d47063350871802) | `FINALIZED / FINISHED_WITH_RETURN / MAJORITY_AGREE`; policy `READY`, revision `3` |
| Consume exactly `10000 USD_CENTS` | [`0x41e6c8…500dd`](https://explorer-studio-dev.genlayer.com/tx/0x41e6c85fc1780c61d4f20f5c2868bb771536708fdcf3d2e404ca04539ac500dd) | `FINALIZED / FINISHED_WITH_RETURN / MAJORITY_AGREE`; policy `CONSUMED`, revision `4` |
| Replay at revision `4` | fee-free simulation | Rejected with `AUTHORIZATION_NOT_READY`; no fee or state mutation |

- Confirmation receipt SHA-256: `e1df5c68b73cbcf13b12fe556eae63ffadee8743cef0a7b6e02dd237996d12ff`.
- Drift: `NON_MATERIAL_SOURCE_CHANGE`; magnitude, time, coordinates, place and reviewed status are unchanged.
- Bound executor: `0xf96Cf822F9f4e76956AB9fAAa22B3BdCD7b10aD6`.
- Final state: `CONSUMED`, `consumed_amount = 10000`, revision `4`.

Historical or fabricated evidence was not used. Both receipts came from validator fetches of the authoritative USGS record.
