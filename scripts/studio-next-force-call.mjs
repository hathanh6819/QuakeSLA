import { createAccount, createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const contract = process.env.QUAKE_CONTRACT;
const key = process.env.QUAKE_KEY;
const method = process.env.QUAKE_METHOD;
const args = JSON.parse(process.env.QUAKE_ARGS || "[]");
if (!contract || !key || !method) throw new Error("Missing QUAKE_CONTRACT, QUAKE_KEY, or QUAKE_METHOD");

const chain = {
  ...studioDevnet,
  name: "GenLayer Studio Next",
  rpcUrls: { default: { http: ["https://studio-next.genlayer.com/api"] } },
};
const account = createAccount(key.startsWith("0x") ? key : `0x${key}`);
const client = createClient({ chain, account });

// Conservative profile based on the finalized v3 assessment. This path is
// reserved for a Studio simulation-time discrepancy: Studio's fee simulation
// can retain an older block timestamp after a delay has elapsed. It skips only
// that fee simulation; execution still runs every guard under validator
// consensus. Never pass a private key except through QUAKE_KEY.
const distribution = {
  leaderTimeunitsAllocation: "120",
  validatorTimeunitsAllocation: "240",
  appealRounds: "0",
  executionBudgetPerRound: "120000000000000",
  totalMessageFees: "0",
  rotations: ["3"],
  maxPriceGenPerTimeUnit: "2",
  storageFeeMaxGasPrice: "300000000",
  receiptFeeMaxGasPrice: "300000000",
};
const txHash = await client.writeContract({
  account,
  address: contract,
  functionName: method,
  args,
  // Let the SDK calculate the required deposit from the live fee policy while
  // deliberately skipping contract execution simulation.
  fees: { distribution, messageAllocations: [] },
});
console.log(JSON.stringify({ stage: "submitted_without_simulation", txHash, account: account.address, method }));
const receipt = await client.waitForTransactionReceipt({ hash: txHash, waitUntil: "finalized", fullTransaction: false });
console.log(JSON.stringify({
  stage: "finalized", txHash, status: receipt.status_name,
  execution: receipt.txExecutionResultName, result: receipt.result,
  lifecycle: receipt.lifecycle, fees: receipt.fees,
}, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
