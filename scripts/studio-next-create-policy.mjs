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

const write = {
  account,
  address: contract,
  functionName: "create_policy",
  args: [
    account.address,
    executorAddress,
    "Studio Next earthquake SLA",
    "Global",
    40,
    1_700_000_000_000,
    1_900_000_000_000,
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

console.log(JSON.stringify({ txHash, owner: account.address, executor: executorAddress }));
const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  status: TransactionStatus.FINALIZED,
  fullTransaction: false,
});
console.log(JSON.stringify(receipt, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
