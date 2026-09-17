import { createAccount, createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const rpcUrl = "https://studio-next.genlayer.com/api";
const contract = process.env.QUAKE_CONTRACT;
const key = process.env.QUAKE_KEY;
const method = process.env.QUAKE_METHOD;
const args = JSON.parse(process.env.QUAKE_ARGS || "[]");

if (!contract || !key || !method) throw new Error("Missing QUAKE_CONTRACT, QUAKE_KEY, or QUAKE_METHOD");

const chain = {
  ...studioDevnet,
  name: "GenLayer Studio Next",
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: "Studio Dev Explorer", url: "https://explorer-studio-dev.genlayer.com" } },
};
const account = createAccount(key.startsWith("0x") ? key : `0x${key}`);
const client = createClient({ chain, account });
const write = { account, address: contract, functionName: method, args };
const estimate = await client.estimateTransactionFeesForWrite(write);
console.log(JSON.stringify({ stage: "estimated", account: account.address, method, feeValue: estimate.feeValue, distribution: estimate.distribution }, (_, value) => typeof value === "bigint" ? value.toString() : value));
const txHash = await client.writeContract({
  ...write,
  fees: {
    distribution: estimate.distribution,
    messageAllocations: estimate.messageAllocations,
    feeValue: estimate.feeValue,
  },
});
console.log(JSON.stringify({ stage: "submitted", txHash, account: account.address, method }));
const receipt = await client.waitForTransactionReceipt({ hash: txHash, waitUntil: "finalized", fullTransaction: false });
console.log(JSON.stringify({
  stage: "finalized",
  txHash,
  status: receipt.status_name,
  execution: receipt.txExecutionResultName,
  result: receipt.result,
  lifecycle: receipt.lifecycle,
  fees: receipt.fees,
}, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
