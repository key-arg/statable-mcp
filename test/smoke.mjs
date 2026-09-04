// Smoke test: start the server over stdio, run initialize + tools/list.
// With STATABLE_API_KEY set it also calls get_subscription against the real endpoint.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, "..", "bin", "statable-mcp.js");
const hasKey = Boolean(process.env.STATABLE_API_KEY);

const client = new Client({ name: "smoke", version: "0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [bin],
  env: { ...process.env },
  stderr: "pipe",
});
await client.connect(transport);

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
console.log(`tools/list -> ${tools.length} tools (${hasKey ? "remote" : "bundled"})`);
assert.ok(tools.length >= 25, `expected >= 25 tools, got ${tools.length}`);
for (const t of tools) {
  assert.equal(typeof t.name, "string");
  assert.equal(typeof t.description, "string");
  assert.equal(t.inputSchema?.type, "object", `${t.name}: inputSchema.type must be object`);
}
for (const required of ["list_sites", "query_stats", "create_goal", "funnel_report", "get_subscription"]) {
  assert.ok(names.includes(required), `missing tool ${required}`);
}

const sub = await client.callTool({ name: "get_subscription", arguments: {} });
if (hasKey) {
  assert.ok(!sub.isError, `get_subscription failed: ${JSON.stringify(sub.content)}`);
  console.log("tools/call get_subscription ->", JSON.stringify(sub.content?.[0]).slice(0, 200));
} else {
  assert.equal(sub.isError, true);
  assert.match(sub.content[0].text, /STATABLE_API_KEY/);
  console.log("tools/call without key -> isError with guidance (ok)");
}

await client.close();
console.log("smoke: ok");
