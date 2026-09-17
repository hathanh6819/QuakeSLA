import { createAccount, createClient } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import { studioDevnet } from "genlayer-js/chains";

const rpcUrl = "https://studio-next.genlayer.com/api";
const contract = process.env.QUAKE_CONTRACT;
const ownerKey = process.env.QUAKE_OWNER_KEY;
const executorAddress = process.env.QUAKE_EXECUTOR;

if (!contract || !ownerKey || !executorAddress) {
  throw new Error("Missing QUAKE_CONTRACT, QUAKE_OWNER_KEY, or QUAKE_EXECUTOR");
}

const chain = {
  ...studioDevnet,
  name: "GenLayer Studio Next",
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: "Studio Dev Explorer", url: "https://explorer-studio-dev.genlayer.com" } },
};
const account = createAccount(ownerKey.startsWith("0x") ? ownerKey : `0x${ownerKey}`);
const client = createClient({ chain, account });
const coverageStartMs = Number(process.env.QUAKE_COVERAGE_START_MS || Date.now() + 120_000);
const coverageEndMs = Number(process.env.QUAKE_COVERAGE_END_MS || coverageStartMs + 365 * 24 * 60 * 60 * 1000);
const agreementId = process.env.QUAKE_AGREEMENT_ID || `LIVE-${coverageStartMs}`;
const actionDigest = process.env.QUAKE_ACTION_DIGEST || `sha256:${"a".repeat(64)}`;
const minMagnitudeTenths = Number(process.env.QUAKE_MIN_MAGNITUDE_TENTHS || 10);

const write = {
  account,
  address: contract,
  functionName: "create_policy",
  args: [
    agreementId,
    actionDigest,
    "USD_CENTS",
    10_000,
    account.address,
    executorAddress,
    "Studio Next earthquake SLA",
    "Global",
    minMagnitudeTenths,
    coverageStartMs,
    coverageEndMs,
    -900_000,
    900_000,
    -1_800_000,
    1_800_000,
  ],
};
const estimate = await client.estimateTransactionFeesForWrite(write);
console.log(JSON.stringify({ feeValue: estimate.feeValue, distribution: estimate.distribution }, (_, value) => typeof value === "bigint" ? value.toString() : value));
const txHash = await client.writeContract({
  ...write,
  fees: {
    distribution: estimate.distribution,
    messageAllocations: estimate.messageAllocations,
    feeValue: estimate.feeValue,
  },
});

console.log(JSON.stringify({ txHash, owner: account.address, executor: executorAddress, agreementId, actionDigest, coverageStartMs, coverageEndMs, minMagnitudeTenths }));
const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  status: TransactionStatus.FINALIZED,
  fullTransaction: false,
});
console.log(JSON.stringify(receipt, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
