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
| Stale frontend state | Every mutating follow-up carries `expected_revision` | Revert `STALE_REVISION` |
| Unauthorized assessment | Only policy owner or beneficiary | Revert `ONLY_POLICY_PARTY` |
| Unauthorized execution | Exact bound executor address | Revert `ONLY_EXECUTION_AUTHORITY` |
| Replay execution | Consumed flag + terminal status + revision increment | Second call reverts |
| Source outage / disagreement | strict equivalence plus `UNRESOLVED` fail-closed result | No authorization |

## Remaining operational risks

- USGS can correct a reviewed event. The stored SHA-256 receipt preserves which response validators accepted.
- Bounding boxes intentionally model contract scope without pretending to calculate physical damage.
- Studio Next is a release-candidate network and may reset; submission evidence should include transaction hashes and screenshots.
- The executor must still enforce the authorized action digest/credit amount in its own billing system. QuakeSLA authorizes the SLA condition, not arbitrary payment calldata.

