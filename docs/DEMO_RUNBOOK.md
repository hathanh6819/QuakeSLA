# Demo runbook

1. Open the deployed frontend and show Studio Next / chain 61997 in the header.
2. Connect a wallet. Briefly explain that policy creation commits the parties, future coverage, action digest and credit cap. Open the review panel to show live fee estimation, but do not create a redundant policy for the recording.
3. Load existing policy `1` in the evidence explorer. Show its terminal `CONSUMED` state, revision `6`, committed terms and consumed amount.
4. Show event `us7000thzz` and explain that the caller supplied only this ID. The contract constructed the fixed USGS URL and validators fetched the record independently.
5. Show the canonical receipt: `APPROVED`, `USGS_REVIEWED_EVENT_MATCH`, magnitude `5.0`, place, source URL and response SHA-256.
6. Open assessment transaction `0x68801d6669d482463cdb8aae6bd33c30d9794fc3020d4d404e461c9fb8055959` in Explorer. Show `FINISHED_WITH_RETURN`, five initial validators and `MAJORITY_AGREE`.
7. Open consume transaction `0x8c281ba945b630297be53dfb8004f42ca21230d2000f1395595e429a877d68d3`. Show `FINISHED_WITH_RETURN` and the executor-bound one-time consumption.
8. Open replay transaction `0x5a2b5546dc62a6b3e64d283210ab04754e9e68463a2e7ca084a4743cbaad2fcd`. Show finalized `FINISHED_WITH_ERROR` and `AUTHORIZATION_NOT_READY`, then return to policy `1` to prove state stayed `CONSUMED`, revision `6`, amount `10000`.
9. Mention the earlier live provisional event result `USGS_NOT_REVIEWED` to demonstrate fail-closed handling rather than fabricated approval.
10. End with the architecture: USGS = evidence authority, GenLayer = judgment authority, billing wallet/system = execution authority.
