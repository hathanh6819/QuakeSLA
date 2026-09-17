# Demo runbook

1. Open the deployed frontend and show Studio Next / chain 61997 in the header.
2. Connect the provider wallet and create a policy covering the chosen reviewed USGS event's time and coordinates.
3. Show Transaction Kit estimating the fee, then submit and wait for `FINISHED_WITH_RETURN`.
4. Load the new policy in the evidence explorer and point out revision `1`, status `ACTIVE` and committed terms.
5. Submit the USGS event ID. Explain that the contract constructs the URL; the user never supplies an evidence URL or verdict.
6. Open the finalized transaction in Explorer and show five initial validators and the consensus votes.
7. Refresh policy evidence: show `READY`, `APPROVED`, normalized magnitude/location, reason code, source URL and response SHA-256.
8. Switch to the bound executor wallet and consume the authorization. Show terminal `CONSUMED` and revision increment.
9. Attempt replay or use the wrong wallet to demonstrate deterministic rejection.
10. End with the architecture: USGS = evidence authority, GenLayer = judgment authority, billing wallet/system = execution authority.

