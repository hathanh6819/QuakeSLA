import { readFile } from "node:fs/promises";

const code = await readFile(new URL("../contracts/quake_sla.py", import.meta.url), "utf8");
const response = await fetch("https://studio-next.genlayer.com/api", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "gen_getContractSchemaForCode", params: [code] }),
});
const payload = await response.json();
if (!response.ok || payload.error) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(payload.result, null, 2));
