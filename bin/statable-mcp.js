#!/usr/bin/env node
// Statable MCP server (stdio).
//
// Thin bridge between a local MCP client (Claude Desktop, Cursor, Glama, any
// stdio-only host) and the hosted Statable MCP endpoint. Every tool call is
// forwarded to https://mcp.statable.com/mcp with your API key. Without a key
// the server still starts and lists its tools, so hosts can inspect it, but
// calls return an explanation instead of data.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));
const STATIC_TOOLS = JSON.parse(readFileSync(join(here, "..", "lib", "tools.json"), "utf8"));

const DOCS_URL = "https://statable.com/docs/integrations/mcp/";
const DEFAULT_URL = "https://mcp.statable.com/mcp";

function readArg(name) {
  const i = process.argv.indexOf(name);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const withEq = process.argv.find((a) => a.startsWith(`${name}=`));
  return withEq ? withEq.slice(name.length + 1) : undefined;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  process.stdout.write(`statable-mcp ${pkg.version}

MCP server (stdio) for Statable web analytics.

Usage:
  STATABLE_API_KEY=stbl_... statable-mcp
  statable-mcp --api-key stbl_...

Options:
  --api-key <key>   Statable API key (or env STATABLE_API_KEY)
  --url <url>       Remote MCP endpoint (default ${DEFAULT_URL}, or env STATABLE_MCP_URL)
  --version         Print version
  --help            This text

Create a key in the Statable dashboard: Settings -> API keys.
Docs: ${DOCS_URL}
`);
  process.exit(0);
}
if (process.argv.includes("--version")) {
  process.stdout.write(`${pkg.version}\n`);
  process.exit(0);
}

const apiKey = readArg("--api-key") || process.env.STATABLE_API_KEY || "";
const remoteUrl = readArg("--url") || process.env.STATABLE_MCP_URL || DEFAULT_URL;

const NO_KEY_TEXT =
  "Statable MCP: no API key configured, so this call was not forwarded.\n" +
  "Set STATABLE_API_KEY (a key starting with stbl_) in the server environment, " +
  "or pass --api-key. Create one in the Statable dashboard under Settings -> API keys.\n" +
  `If your client supports OAuth, connect directly to ${DEFAULT_URL} instead and sign in in the browser.\n` +
  `Docs: ${DOCS_URL}`;

let remote = null;
let remoteConnecting = null;

async function getRemote() {
  if (remote) return remote;
  if (remoteConnecting) return remoteConnecting;
  remoteConnecting = (async () => {
    const client = new Client({ name: pkg.name, version: pkg.version });
    const transport = new StreamableHTTPClientTransport(new URL(remoteUrl), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
    });
    client.onclose = () => {
      remote = null;
    };
    await client.connect(transport);
    remote = client;
    return client;
  })();
  try {
    return await remoteConnecting;
  } finally {
    remoteConnecting = null;
  }
}

function errorResult(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}

function describeError(err) {
  const msg = err && err.message ? err.message : String(err);
  if (/401|unauthori[sz]ed|invalid.*token|missing or malformed bearer/i.test(msg)) {
    return (
      `Statable MCP: the remote endpoint rejected the API key (${msg}). ` +
      "Check STATABLE_API_KEY: it must start with stbl_, be unexpired, and have access to the site you asked about. " +
      `Docs: ${DOCS_URL}`
    );
  }
  return `Statable MCP: remote call failed: ${msg}`;
}

const server = new Server(
  { name: "statable", version: pkg.version },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  if (apiKey) {
    try {
      const client = await getRemote();
      const res = await client.listTools();
      if (res && Array.isArray(res.tools) && res.tools.length > 0) return { tools: res.tools };
    } catch (err) {
      process.stderr.write(`statable-mcp: remote tools/list failed, serving bundled list: ${err?.message || err}\n`);
      remote = null;
    }
  }
  return { tools: STATIC_TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (!apiKey) return errorResult(NO_KEY_TEXT);
  const { name, arguments: args } = req.params;
  try {
    const client = await getRemote();
    return await client.callTool({ name, arguments: args ?? {} });
  } catch (err) {
    remote = null;
    return errorResult(describeError(err));
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(
  `statable-mcp ${pkg.version} ready (${apiKey ? "forwarding to " + remoteUrl : "no API key: tools listed, calls disabled"})\n`,
);
