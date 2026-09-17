import { createAccount, createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const rpcUrl = "https://studio-next.genlayer.com/api";
const contract = process.env.QUAKE_CONTRACT;
const key = process.env.QUAKE_TEST_KEY;

if (!contract || !key) throw new Error("Missing QUAKE_CONTRACT or QUAKE_TEST_KEY");

const chain = {
  ...studioDevnet,
  name: "GenLayer Studio Next",
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: "Studio Dev Explorer", url: "https://explorer-studio-dev.genlayer.com" } },
};

const account = createAccount(key.startsWith("0x") ? key : `0x${key}`);
const client = createClient({ chain, account });
const args = [
  "SLA-2026-001",
  `sha256:${"a".repeat(64)}`,
  "USD_CENTS",
  10_000,
  account.address,
  account.address,
  "Studio Next earthquake SLA",
  "Global",
  40,
  1_900_000_000_000,
  1_950_000_000_000,
  -900_000,
  900_000,
  -1_800_000,
  1_800_000,
];

const estimate = await client.estimateTransactionFeesForWrite({
  account,
  address: contract,
  functionName: "create_policy",
  args,
});

console.log(JSON.stringify({
  account: account.address,
  feeValue: estimate.feeValue?.toString(),
  distribution: estimate.distribution,
  messageAllocations: estimate.messageAllocations,
}, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
