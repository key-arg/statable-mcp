# Statable MCP tools

Live docs: https://statable.com/docs/integrations/mcp/. Tool names below are the base
names; the prefix your client shows (for example `mcp__statable__list_goals` or a
plugin-scoped prefix) varies.

## Contents

1. Connecting
2. Common parameters
3. Read tools
4. Write tools and their traps
5. Funnel step shape
6. Recipes
7. Without the MCP server

---

## 1. Connecting

- Hosted endpoint: `https://mcp.statable.com/mcp` (Streamable HTTP, OAuth 2.1). This
  plugin ships it in `.mcp.json`. Manual: `claude mcp add statable --scope user --transport http https://mcp.statable.com/mcp`.
- Clients without OAuth: `npx -y @statable/mcp` with `STATABLE_API_KEY=stbl_...` in the
  environment. Never ask for the key in chat and never commit it.
- Write tools need the `sites:write` scope ("Create and configure your sites" on the
  OAuth consent screen; for an API key the permission is called "Manage sites"). The
  grant is fixed per connection: to widen it, disconnect and reconnect. Without it the
  write tools are hidden, not failing.
- Writes are owner-only. A site shared with the user returns `403 not_site_owner`.
- `get_tracking_settings` is read-only but needs the same write permission.
- No MCP tool deletes anything. Delete goals and funnels in the dashboard, with
  `statable goals delete` / `statable funnels delete`, or `DELETE` in the REST API.
- **Several Statable servers connected** (e.g. prod and a dev or local one, with different
  tool sets): use the one whose `list_sites` contains the domain, and name it in the plan.

## 2. Common parameters

- `site`: numeric site id (preferred) or a domain. Scheme, `www.` and path are ignored.
  If several sites share a domain the call fails and lists their ids. Goal, funnel-write
  and settings tools require it.
- `period`: `month`, or `Nd` from `1d` to `90d`; default `30d`. `list_prop_keys` and
  `funnel_report` also accept `["YYYY-MM-DD","YYYY-MM-DD"]`.

## 3. Read tools (safe to call during an audit)

| Tool | Use it to |
| --- | --- |
| `list_sites` | Match the domain to a site id. `hobby: true` = free site using a widget bundle. |
| `get_subscription` | Check status (trial, active, expired) before promising features. |
| `get_tracking_snippet` (`site`) | Get the exact tag to install. Install `snippet` verbatim. |
| `get_tracking_settings` (`site`) | See enabled features before relying on `tagged`, `forms`, `scroll`, `status`, `props`. |
| `list_goals` (`site`) | Existing goals: `id, name, event_name, path, operator, scroll_depth` (null fields omitted). |
| `list_funnels` | Existing funnels: `id, name, scope, steps_count`. To see the steps themselves, run `funnel_report` for each. |
| `top_custom_events` | Event names and volumes actually received (`events`, `visitors`). High events per visitor flags noise. |
| `list_prop_keys` | Property keys received per event, with first-seen date. |
| `top_goals` | Conversions, converters and `conversion_rate` per goal. |
| `funnel_report` (`funnel_id`) | Per step: visitors, cumulative conversion vs step 1, drop-off vs previous step. Filters are session-level only. |
| `query_stats` | Flexible queries; see below. |
| `top_pages`, `top_sources`, `top_countries`, `visitors_over_time`, `current_visitors` | Traffic context and realtime checks. |
| `get_site_filters` | Hostname, IP and country filters (explains missing data). |

`query_stats` essentials:

- Required: `metrics[]`, `date_range` (`realtime`, `Nd`, `month`, ...).
- Metrics: `visitors, pageviews, visits, visit_duration, bounce_rate, views_per_visit,
  engagement_time, events, conversion_rate, time_on_page, scroll_depth, exit_rate`
  (`events` and `conversion_rate` in breakdowns only).
- At most one dimension, always prefixed, e.g. `event:name`, `event:goal`, `event:page`,
  `visit:source`, `visit:channel`, `visit:utm_campaign`, `visit:entry_page`,
  `visit:device`, `visit:country`, `time:day`. Unprefixed names return `400 unknown_dimension`.
- In `filters[].field` names are written **without** the prefix (`country`, `page`,
  `entry_page`, `event`).
- Property breakdown needs an event filter:
  `dimensions: ["event:props:plan"], filters: [{field: "event", operator: "is", values: ["Sign Up Completed"]}]`.
- Filter operators: `is, is_not, contains, does_not_contain`; values are OR-ed and may
  not contain commas. The `event` filter takes `is` with a single value.

## 4. Write tools (only after the user approved the specific call)

| Tool | Parameters | Trap |
| --- | --- | --- |
| `create_site` | `url` (with scheme), `timezone?` (IANA), `hobby?` | Existing URL → `site_exists`. Follow with `get_tracking_snippet`. A new site may need about a minute before it accepts events. |
| `update_site` | `site`, `url?`, `timezone?`, `week_start?` (0 = Sunday) | Omitted fields are kept. |
| `create_goal` | `site`, `name`, and exactly one of: `event_name` / `path` + `operator` / `scroll_depth` | Duplicate name → `goal_exists`. See goal semantics below. |
| `update_goal` | `site`, `goal_id`, `name` + definition | **Full replace**: omitted fields are cleared. |
| `create_funnel` | `site`, `name`, `steps[]`, `scope?` (`visitor` default / `session`), `strict_order?` | Duplicate name → `funnel_exists`. See section 5. |
| `update_funnel` | `site`, `funnel_id`, `name`, `steps`, `scope?`, `strict_order?` | **Full replace**, every step. An omitted `scope` resets to `visitor` and an omitted `strict_order` to `false`: read the current values (`list_funnels`) and send them again. |
| `update_tracking_settings` | `site`, `features[]` | **Replaces the whole selection**; `[]` turns off every optional feature. Read first, merge, send the full list. |
| `update_site_filters` | `site`, `hostnames?`, `blocked_ips?`, `countries?`, `public_dashboard?` | A sent section is replaced entirely; omitted sections are untouched. |

**Goal semantics:**

- Path operators: `e` exact, `b` begins with, `c` contains. The path is matched
  literally: **no wildcards** (`/blog/*` never matches; use `b` + `/blog/`). The query
  string and fragment are stripped at ingest, so never put `?...` in a goal path.
  A trailing slash matters for `e`.
- Event goals match the stored event name exactly, case-sensitive.
- Goals are **retroactive**: applied at query time, so a new goal shows past matches
  and an edited goal rewrites reported history. They never create events.
- Give only one kind per goal. Combining event and path is not a supported definition.
- Scroll-depth goals need `engagement` + `scroll` and count once per session.
- There is no revenue or value field.
- The MCP computes `conversion_rate` as converters / all visitors.

**Recommended order:** ship the event code → confirm it arrives in `top_custom_events`
→ create event goals with the exact name → create funnels. Pageview goals can be
created at any time.

## 5. Funnel step shape

- 2 to 8 steps. Kinds: `page`, `event`, `entry_page` (first step only), `exit_page`
  (last step only), `goal` (`goal_id`), `scroll` (`threshold` 0 to 100).
- The MCP schema advertises `{"type": ..., "value": ...}`, but the server reads only the
  `kind` shape and answers the advertised one with `step 1: unknown kind ""`. **Always
  send every step in both shapes**: the schema requires `type`/`value`, the server uses
  `kind` and ignores the rest.

```json
{"type": "page", "value": "/pricing", "kind": "page", "path": "/pricing", "operator": "e"}
{"type": "page", "value": "/products/", "kind": "page", "path": "/products/", "operator": "b"}
{"type": "event", "value": "Onboarding Step Completed", "kind": "event", "event": "Onboarding Step Completed", "prop_key": "step", "prop_value": "done"}
```

- Only the `kind` shape carries a page `operator` (`e`, `b`, `c`, `r`; default `e`), so
  recipes like `page /products/ (b)` depend on it.
- An event step may narrow by one property with `prop_key` + `prop_value` (exact match).
  Use it when one event fires at several stages; otherwise prefer a distinct outcome event.
- For `goal` and `scroll` steps pass `type` `page` with any `value` to satisfy the schema,
  plus `kind` and `goal_id` / `threshold`.

If the call still fails, do not keep retrying: give the user the funnel as dashboard
steps (Funnels → New funnel) and continue with the rest of the plan. Confirm the result
with `list_funnels` (step count) and `funnel_report`.

Funnel reading: conversion is cumulative against step 1; drop-off is against the
previous step. `strict_order: true` means nothing may happen between steps; reports
before and after changing it are not comparable.

## 6. Recipes

**Audit snapshot (read-only):**

```
list_sites → pick site_id
get_tracking_snippet(site)          # is the installed tag correct?
get_tracking_settings(site)         # which features are on?
list_goals(site); list_funnels(site)
top_custom_events(site, period: "30d", limit: 1000)
list_prop_keys(site, period: "30d")
top_goals(site, period: "30d")
```

**Add a feature without dropping others:** `get_tracking_settings` → take `enabled`
→ add the new id (and its requirement, e.g. `engagement` for `scroll`) →
`update_tracking_settings(site, features: <full list>)`.

**Verify after deploy:** `current_visitors`, `top_custom_events(period: "1d")`,
`list_prop_keys(period: "1d")`, `query_stats(metrics: ["visitors"], date_range: "realtime")`.

## 7. Without the MCP server

The skill still works; only the account-side steps change.

- **Dashboard:** give the user exact steps and values: goal name, type, path and
  operator or event name; funnel name, scope and ordered steps; feature toggles in
  Site settings → Tracking features.
- **statable CLI** (https://statable.com/docs/cli/): `statable auth login`, `statable sites`,
  `statable sites use example.com`, read commands with `--json`, and writes such as
  `statable goals create --name Signup --event Signup`,
  `statable funnels create --name Checkout --step page:/pricing --step event:Signup`,
  plus `edit` (a full replace) and `delete` for both.
- **HTTP API** (`/api/v1`, server-side only, no CORS): OpenAPI at
  https://statable.com/api/v1/openapi.yaml; goals and funnels at
  https://statable.com/docs/developers/stats-api/goals-funnels/. Funnels via REST use
  the `kind` step shape (`POST /api/v1/sites/{id}/funnels`).
- Creating an account through the API requires the person to read and accept the Terms
  themselves; never set an acceptance flag on their behalf.
