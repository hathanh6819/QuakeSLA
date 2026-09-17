# Adversarial audit

## Trust boundaries

- **Authoritative fact source:** USGS Earthquake Hazards Program.
- **Judgment:** GenLayer validators independently fetch and recompute.
- **Execution:** a pre-bound executor, never the judgment method itself.
- **Untrusted inputs:** event ID, policy parameters, caller wallet and frontend.

## Attacks and controls

| Attack | Control | Expected outcome |
| --- | --- | --- |
| Arbitrary URL / SSRF | Event ID allows only bounded ASCII alphanumerics, `_` and `-`; hostname/path are constants | Revert `INVALID_EVENT_ID` |
| Substitute a different event | Returned `data.id` must equal the submitted ID | `UNRESOLVED / EVENT_IDENTITY_MISMATCH` |
| Use provisional event data | USGS `status` must be `reviewed` | `UNRESOLVED / USGS_NOT_REVIEWED` |
| Oversized/malformed response | 20 KB limit, required structure and guarded JSON parsing | `UNRESOLVED`, never approval |
| Low-magnitude event | Validators recompute tenths from USGS `mag` | `DENIED / BELOW_MAGNITUDE_THRESHOLD` |
| Event outside time/region | Validators compare committed window and E4 bounds | Deterministic denial |
| Submit an irrelevant event to destroy future coverage | `DENIED` is claim-level; policy returns to `ACTIVE` for a later event | Evidence recorded, coverage remains usable |
| Stale frontend state | Every mutating follow-up carries `expected_revision` | Revert `STALE_REVISION` |
| Unauthorized assessment | Only policy owner or beneficiary | Revert `ONLY_POLICY_PARTY` |
| Unauthorized execution | Exact bound executor address | Revert `ONLY_EXECUTION_AUTHORITY` |
| Replay execution | Consumed flag + terminal status + revision increment | Second call reverts |
| Source outage / disagreement | strict equivalence plus `UNRESOLVED` fail-closed result | No authorization |
| Buy coverage after observing a quake | Coverage start must be strictly after on-chain creation time | Revert `INVALID_COVERAGE_WINDOW` |
| Reuse a legitimate verdict for another payout | Canonical agreement ID, action digest, credit unit and cap are immutable and included in evidence | Consume requires exact digest and bounded amount |
| Duplicate agreement registration | Agreement ID is unique within each owner namespace | Revert `AGREEMENT_ALREADY_REGISTERED` |
| Fill a global policy cap | No global cap; quota is per owner (`100`) | Attacker only exhausts their own namespace |
| Provider cancels after risk period begins | Cancellation checks on-chain time against committed coverage start | Revert `COVERAGE_ALREADY_STARTED` |
| Executor hides the amount it applied | Consumed amount is persisted with executor identity and immutable scope | `consumed_amount` is auditable from `get_policy` |

## Remaining operational risks

- USGS can correct a reviewed event. The stored SHA-256 receipt preserves which response validators accepted.
- Bounding boxes intentionally model contract scope without pretending to calculate physical damage.
- Studio Next is a release-candidate network and may reset; submission evidence should include transaction hashes and screenshots.
- The contract binds an action digest and credit cap, but the executor must still recompute the digest from the real billing action before applying it. QuakeSLA does not transfer funds.
- Agreement uniqueness is scoped to the registering owner. An integration must trust or authenticate that owner as the real SLA authority; a stranger can create an unrelated lookalike policy under their own namespace.
- A compromised bound executor can consume a valid authorization, but cannot change its digest or exceed its credit cap. Operational key custody remains outside this contract.
