# Studio Next live evidence

The source-access probe uses the same pinned Studio Next runner and fixed USGS detail endpoint pattern as QuakeSLA. It independently fetched the reviewed `us7000thsp` record under validator consensus.

- Network: Studio Next (`61997`)
- RPC: `https://studio-next.genlayer.com/api`
- Probe contract: `0x642AA32740A319FC2062b78b86EA5FDF3ed8ec98`
- Finalized transaction: `0x520be48f0ac018ad19a4f9b86521c8c8c5b09432e35e4198b5d698d257b66550`
- Result: `FINISHED_WITH_RETURN`, `MAJORITY_AGREE`
- Validator outcome: 3 agree, 2 idle
- Stored observation: `{"id":"us7000thsp","mag":4.8,"updated":1789543705040}`

This probe proves live validator access to the authoritative source. It is not the production QuakeSLA deployment. Production evidence must additionally show a finalized `create_policy`, an approved or denied `assess_event`, the resulting state/evidence view, and one authorization-control branch.
