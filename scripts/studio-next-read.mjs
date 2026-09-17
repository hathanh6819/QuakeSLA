import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const address = process.env.QUAKE_CONTRACT;
const functionName = process.env.QUAKE_METHOD;
const args = JSON.parse(process.env.QUAKE_ARGS || "[]");
if (!address || !functionName) throw new Error("Missing QUAKE_CONTRACT or QUAKE_METHOD");
const client = createClient({ chain: { ...studioDevnet, name: "GenLayer Studio Next", rpcUrls: { default: { http: ["https://studio-next.genlayer.com/api"] } } } });
const result = await client.readContract({ address, functionName, args, stateStatus: "finalized" });
console.log(typeof result === "string" ? result : JSON.stringify(result, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
