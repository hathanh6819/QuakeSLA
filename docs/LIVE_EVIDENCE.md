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

## Production deployment

- QuakeSLA contract: `0x7D2558EE3D6eA3c24dB5edD9D2CdC613C24e9659`
- Network: Studio Next (`61997`)
- Explorer: `https://explorer-studio-dev.genlayer.com/`

## Finalized production lifecycle

The following lifecycle was executed with two independently controlled test wallets. Each positive transaction reached `FINALIZED`, `MAJORITY_AGREE`, and `FINISHED_WITH_RETURN`.

| Step | Caller | Transaction | Result |
| --- | --- | --- | --- |
| Create policy `1` | owner / beneficiary `0x1D283b45974B0be9630DFD1deC6A62a9B72B2760` | `0x64434a8ef7852f6cd89cd403005deecdb9949a99a73646729f7852855667dbd3` | `ACTIVE`, revision `1` |
| Assess reviewed USGS event | owner / beneficiary | `0x64a3f0e1591cedfc9c7b0d104c2f5ecdc16fb11687115a9e9ccc1b381478b699` | `READY`, `APPROVED`, revision `2` |
| Consume authorization | executor `0xf96Cf822F9f4e76956AB9fAAa22B3BdCD7b10aD6` | `0xeefe40bc1f94d346ba8cd53444f15940d4dd99256aca99be3f5e2ba928223f5c` | `CONSUMED`, revision `3` |

Finalized policy state confirms `consumed = 1` and `consumed_by = 0xf96c...0ad6`. The validator-produced evidence receipt contains:

```json
{
  "event_id": "us7000thsp",
  "event_time_ms": 1789542133029,
  "latitude_e4": 60969,
  "longitude_e4": -778115,
  "magnitude_tenths": 48,
  "place": "47 km WSW of Bahia Solano, Colombia",
  "reason": "USGS_REVIEWED_EVENT_MATCH",
  "sha256": "b2dcb8aca2acbdc76862f12da7164322695c417ea1667f57dda8667a0cc4ee0d",
  "source": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/us7000thsp.geojson",
  "status": "reviewed",
  "verdict": "APPROVED"
}
```

This digest is computed inside each validator from the fetched response body. It is not supplied by the caller. `strict_eq` requires equivalent canonical receipts before state can become `READY`.

## Adversarial result

After consumption, a second `consume_authorization(1, 3)` was simulated from the bound executor. GenVM rejected it with `AUTHORIZATION_NOT_READY`; no transaction was submitted and finalized state remained `CONSUMED`, revision `3`. This proves replay is rejected without wasting an additional on-chain fee.

## Measured fee profile

The application preserves the SDK-provided `distribution` and `feeValue` unchanged when submitting. Measured Studio Next deposits were:

- `create_policy`: `613890000010352` wei; consumed `78643750000000` wei.
- `assess_event`: `623065200010352` wei; consumed `80315250000000` wei.
- `consume_authorization`: `613825200010352` wei; consumed `78630250000000` wei.

These are measurements from this run, not hard-coded fee promises; the frontend estimates again immediately before every write.

## Reproduction

The scripts in `scripts/` accept keys only through environment variables and never store them. Use `studio-next-read.mjs` and `studio-next-status.mjs` for read-only verification; use `studio-next-estimate.mjs`, `studio-next-create-policy.mjs`, and `studio-next-call.mjs` to reproduce fee-aware writes.
