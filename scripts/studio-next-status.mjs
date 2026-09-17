import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const hash = process.env.QUAKE_TX;
if (!hash) throw new Error("Missing QUAKE_TX");
const client = createClient({
  chain: {
    ...studioDevnet,
    name: "GenLayer Studio Next",
    rpcUrls: { default: { http: ["https://studio-next.genlayer.com/api"] } },
  },
});
const tx = await client.getTransaction({ hash });
console.log(JSON.stringify({
  hash: tx.hash,
  status: tx.status,
  status_name: tx.status_name,
  execution: tx.txExecutionResultName,
  result: tx.result,
  result_name: tx.result_name,
  lifecycle: tx.lifecycle,
  fees: tx.fees,
}, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
