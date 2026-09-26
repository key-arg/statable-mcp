# Statable MCP server

[![npm](https://img.shields.io/npm/v/%40statable%2Fmcp)](https://www.npmjs.com/package/@statable/mcp)

Ask your AI assistant about your website traffic. This package connects Claude, Cursor, ChatGPT, Claude Desktop and any other [MCP](https://modelcontextprotocol.io) client to [Statable](https://statable.com), a privacy-first, cookieless web analytics service hosted in the EU.

It is a thin stdio bridge to the hosted Statable MCP endpoint (`https://mcp.statable.com/mcp`). Every tool call is forwarded there with your API key. Nothing is stored locally.

## Which way to connect

| Your client | Use |
| --- | --- |
| Claude Code, Cursor, ChatGPT, Codex and other clients with OAuth support | Connect **directly** to `https://mcp.statable.com/mcp` and sign in in the browser. No key, no package. See the [docs](https://statable.com/docs/integrations/mcp/). |
| Claude Desktop, hosts that only run local stdio servers, CI scripts, sandboxes | **This package** with an API key. |

## Quick start

1. In the Statable dashboard open **Settings → API keys → Create API key**. Keys start with `stbl_`. Pick the sites and permissions the assistant may use.
2. Add the server to your client. Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "statable": {
      "command": "npx",
      "args": ["-y", "@statable/mcp"],
      "env": { "STATABLE_API_KEY": "stbl_your_key" }
    }
  }
}
```

Cursor (`~/.cursor/mcp.json`) and most other hosts accept the same shape.

Claude Code:

```bash
claude mcp add statable --scope user -e STATABLE_API_KEY=stbl_your_key -- npx -y @statable/mcp
```

3. Ask: *"How many visitors did example.com have last week, and where did they come from?"*

## Tools (25)

**Read**: `list_sites`, `query_stats`, `top_pages`, `top_sources`, `top_countries`, `top_custom_events`, `top_goals`, `list_goals`, `list_prop_keys`, `list_funnels`, `funnel_report`, `current_visitors`, `visitors_over_time`, `get_tracking_snippet`, `get_site_filters`, `get_subscription`

**Set up**: `create_site`, `update_site`, `create_goal`, `update_goal`, `create_funnel`, `update_funnel`, `get_tracking_settings`, `update_tracking_settings`, `update_site_filters`

`query_stats` is the general one: aggregates, time series or a top-N breakdown over any metric (visitors, pageviews, bounce rate, engagement, goals, exit rate…), any dimension (source, page, country, device, UTM, custom event property…) and filters, with period-over-period comparison. All numbers come back in the site's own timezone. Full reference: [statable.com/docs/integrations/mcp](https://statable.com/docs/integrations/mcp/).

Write tools only touch configuration (sites, goals, funnels, tracking features, filters). Nothing deletes data.

## Agent skills

This repository is also a Claude Code plugin: the hosted MCP server (`.mcp.json`, OAuth) plus three skills.

| Skill | What it does |
| --- | --- |
| [statable](skills/statable/SKILL.md) | Audits your codebase or live site, proposes a Measurement Plan (goals, funnels, custom events, properties, tracker features) and, once you approve, implements it in code and in your Statable account, then checks the data arrives. Nothing is written without an explicit yes. |
| [weekly-traffic-report](skills/weekly-traffic-report/SKILL.md) | A short weekly summary of traffic, sources and goals. |
| [traffic-drop-check](skills/traffic-drop-check/SKILL.md) | Finds where a traffic drop comes from. |

Claude Code:

```bash
claude plugin marketplace add key-arg/skills
claude plugin install statable@statable
```

The first Statable tool call opens the browser to sign in. To let the agent create goals and funnels, grant "Create and configure your sites" on the consent screen. If you already added the server with `claude mcp add statable ...`, remove it so the tools don't appear twice.

Gemini CLI (MCP server and skills, via `gemini-extension.json`):

```bash
gemini extensions install https://github.com/key-arg/statable-mcp
```

Other agents (skills only; connect the MCP server as above):

```bash
npx skills add key-arg/statable-mcp
```

Then ask: *"What should I track on this site?"* or run `/statable:statable`.

## Configuration

| Setting | Env | Flag | Default |
| --- | --- | --- | --- |
| API key | `STATABLE_API_KEY` | `--api-key` | none |
| Remote endpoint | `STATABLE_MCP_URL` | `--url` | `https://mcp.statable.com/mcp` |

Without a key the server still starts and advertises its tools (so registries and hosts can inspect it), but every call returns a short message explaining how to add one.

## Run from source

```bash
git clone https://github.com/key-arg/statable-mcp.git
cd statable-mcp
npm install
STATABLE_API_KEY=stbl_your_key npm test
```

Docker:

```bash
docker build -t statable-mcp .
docker run -i --rm -e STATABLE_API_KEY=stbl_your_key statable-mcp
```

## About Statable

[Statable](https://statable.com) is cookieless web analytics built for the EU: no consent banner needed for the core tracker, data hosted in the Netherlands, a tracker between 0.5 and 2 KB, goals, funnels, custom events, a public Stats API and this MCP server. Free tier for personal, educational and open-source sites.

Support: support@statable.com · Registry: `com.statable/analytics` in the [official MCP registry](https://registry.modelcontextprotocol.io/v0.1/servers/com.statable%2Fanalytics/versions/latest)

MIT © Key Arg B.V.
