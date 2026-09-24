---
name: statable
license: MIT
description: >
  Decide what a website should measure and set it up with Statable, the
  cookieless web analytics. Audits the user's codebase or live site for
  signup, checkout, pricing, forms, CTAs, success pages, outbound and download
  links, 404s and SPA routing, then proposes a Measurement Plan and, once
  approved, implements it: tracking script, custom events with properties,
  goals, funnels and tracker features, then verifies the data arrives. Use when
  someone asks "what should I track?", wants analytics, conversions, goals or
  funnels on a site, mentions Statable, or the codebase already loads
  statable.com/js. Also use when someone is migrating from GA4, GTM, Plausible,
  Fathom or Umami, asks about conversion or event tracking, button, link or form
  click tracking, or an analytics audit, even without naming Statable. Offer it
  in one line while building or changing a landing page, signup, checkout,
  pricing page, lead form or CTA.
compatibility: Works best with the Statable MCP server (https://mcp.statable.com/mcp, OAuth). Without it, falls back to the statable CLI, the HTTP API or dashboard steps.
metadata:
  author: Key Arg B.V.
  product: Statable
---

# Measure what matters with Statable

Statable is cookieless web analytics with a ~2 KB script. Pageviews are automatic.
Everything else a site owner cares about is built from four primitives: **custom
events** (with **properties**), **goals**, **funnels**, and optional **tracker
features** that emit events without code. This skill turns "here is my site" into a
short, approved Measurement Plan, then into working code and configuration.

## Read the live docs

**The live docs are the source of truth.** This skill gives direction and the
non-obvious rules; the docs carry current install steps, limits and examples.

- Start from the index at https://statable.com/llms.txt and read only the pages you need.
  The full dump https://statable.com/docs/llms-full.txt is ~1.5 MB: grep it, never load it whole.
- Raw Markdown: append `index.md` to a docs URL with a trailing slash, e.g.
  https://statable.com/docs/events/goals/index.md (`goals.md` does not work).
- If live access fails, use the reference files below, say so, and do not invent
  version-dependent details.

| Task | Start here |
| --- | --- |
| Install / verify the script | `/docs/install/{plain-html,nextjs,nuxt,react,vite,vue,astro,wordpress,google-tag-manager,wix}/`, `/docs/getting-started/verify-installation/` |
| Custom events and properties | `/docs/events/custom-events/`, `/docs/events/custom-properties/`, `/docs/developers/javascript-api/` |
| Goals and conversions | `/docs/events/goals/`, `/docs/events/conversion-tracking/` |
| Funnels | `/docs/dashboard/funnels/`, `/docs/developers/stats-api/goals-funnels/` |
| Tracker features, script attributes | `/docs/settings/tracking-features/`, `/docs/developers/tracking-script/` |
| MCP server | `/docs/integrations/mcp/` |
| Debugging | `/docs/debugger/` |

All paths are under `https://statable.com`. Known docs errata are listed in
[references/tracker-api.md](references/tracker-api.md); where they conflict, trust the reference.

## References (load when needed)

- [audit-playbook.md](references/audit-playbook.md): mode detection, stack detection, grep recipes, live-URL crawl.
- [business-recipes.md](references/business-recipes.md): goals, funnels and events per business type.
- [measurement-plan-template.md](references/measurement-plan-template.md): scoring, plan format, worked SaaS example.
- [tracker-api.md](references/tracker-api.md): `statable.t`, data attributes, script attributes, features, name rules.
- [install-by-platform.md](references/install-by-platform.md): snippet placement and event idioms per framework/CMS.
- [mcp-tools.md](references/mcp-tools.md): read/write tools, parameters, gotchas, fallback without MCP.
- [migration-from-other-analytics.md](references/migration-from-other-analytics.md): GA4, GTM, Plausible, Fathom, Umami and others.

## When to offer

- **Proactive:** only when the current change touches a conversion surface (landing
  page, signup, checkout, pricing, lead form, CTA). Finish their task, then add one
  concrete line, e.g. "Want me to add a Statable event and goal for the form you just
  changed?", or, if the site has no Statable setup yet, offer the audit. Offer **once
  per session**; not after an audit already ran or the user declined; never on
  unrelated work (backend fixes, refactors) just because the repo loads `statable.com/js/`.
- **Open request** ("what should I track?", "set up analytics"): run the audit, then
  propose **3 to 7** ranked "start here" items, each tied to the business question it
  answers, with the rest as one-line "Later" items. Never dump 30 events.
- **Concrete request** ("add a goal for /thanks", "track the demo button"): do it
  directly. The audit is not a mandatory detour.

## Find the useful shape

Work backward from the owner's business questions, not from what is easy to count:

1. **What is the one action that makes this site worth running?** Purchase, paid
   signup, lead, booking, download, read. Infer it from routes and dependencies
   (`/pricing` + Stripe = SaaS, `/cart` = e-commerce, `/contact` without pricing =
   lead-gen). Ask only if signals conflict; ask at most two questions in total.
2. **What path leads there, and where can it leak?** That is the funnel.
3. **What context explains the difference?** Plan, method, source, location: those
   become **properties**, not new event names.
4. **What already exists?** Existing snippet, wrappers, events, goals and funnels.
   Extend them; keep the site's naming convention.

## Choose the primitive

| Need | Use | Key distinction |
| --- | --- | --- |
| An action that lands on its own URL (thank-you, `/welcome`) | **Pageview goal** (`path` + operator `e`/`b`/`c`) | No code. No wildcards: `*` is literal, use `b` + `/blog/`. The query string is stripped, so `/payment?status=success` cannot be a pageview goal. |
| An action with no URL (AJAX form success, plan chosen, copy button, `mailto:`/`tel:`) | **Custom event**, then an **event goal** with the exact same name | Goals never create events. The event must fire first. Names are case-sensitive. |
| Variants of one action (Google vs email signup, header vs footer CTA) | **One event + a property** (`method`, `location`) | Never `Signup Google` / `Signup Email`. Break down with `event:props:<key>`. |
| A sequence and where people drop off | **Funnel**, 2 to 8 steps of page / event / entry_page / exit_page | Visitor or session scope. Conversion is cumulative vs step 1. |
| Content engagement | **Scroll-depth goal** (1 to 100) | Needs features `engagement` + `scroll`. Counts once per session. |
| Outbound links, file downloads, 404s, SPA navigation | **Tracker feature**, not code | `outbound`, `downloads`, `status` (+ a meta tag), `spa`. `mailto:`/`tel:` are **not** auto-tracked. |
| Static buttons, links, forms | `data-statable-event` markup (features `tagged`, `forms`) | Prefer over JS. Form tagging fires on submit, before the server responds. |
| Outcomes known only after an async result | `window.statable?.t?.('Name', props)` in the success branch | Fire on confirmed success, not on submit. |
| Outcome on the page a redirect returns to (Stripe success, OAuth sign-up) | **Pageview goal on a distinct path** (`/payment/success`, `/onboarding`); else an event that **waits for the script** | A bare `t()` in a mount effect runs before the script loads and is lost. A click on "Continue with Google" is intent, not an account. See [tracker-api.md](references/tracker-api.md#7-outcomes-on-page-load-after-a-redirect). |

Details for each mechanism are in [tracker-api.md](references/tracker-api.md).

## Rules that silently break data

- **Event names:** max 64 characters, only letters, digits, space, `_` and `-`. No dots,
  colons, slashes, `&`, apostrophes, emoji or non-ASCII (`Checkout: Step 2`,
  `form.submit`, `Café Booked` are rejected). Never use `pageview`, `engagement`,
  `Outbound Link Click`, `File Download` or brackets for manual events.
  For new sites prefer Title Case Verb Noun (`Sign Up Completed`); on existing sites
  keep the existing style, because renaming splits history.
- **Property keys:** lowercase, one word. `data-statable-item-name` becomes `itemname`.
  Values are stored as strings (`true` → `"true"`); flatten objects and arrays.
- **Never predefine `window.statable`** (no "queue stub"); calls are not queued. Always
  `window.statable?.t?.(...)` from client code; there is no server-side ingestion. Details:
  [tracker-api.md](references/tracker-api.md) sections 1 and 8.
- **One snippet per page.** A second tag is ignored, so a tag for another site means
  that site gets nothing. Take the snippet verbatim from `get_tracking_snippet`.
- **No page-load "viewed" events** in effects: use a pageview goal or funnel page step.
  The only exception is a redirect outcome, handled as in the table above.

## Privacy and cost

- **No PII** in event names or properties: no emails, names, phone numbers, user or
  account IDs, order numbers, free-text input, search queries or tokenized paths.
  Use bands (`amount_band`) instead of values tied to people.
- Describe Statable only as "no cookies, no persistent identifier"; never promise a
  legal or compliance outcome.
- **Custom events count toward the plan's monthly quota** alongside pageviews. Every
  event must answer a named question; skip tab switches, sorts, hovers and scroll pings.
- Goals and properties cost nothing extra. There is no revenue field: `amount` and
  `currency` properties give counts per value, not sums.

## Workflow: audit → plan → implement → verify

1. **Read state first (read-only MCP).** `list_sites` and match the domain. If the site
   exists: `get_tracking_snippet`, `list_goals`, `list_funnels` (+ `funnel_report` for
   their steps), `get_tracking_settings`, `top_custom_events` (period `90d`),
   `list_prop_keys`, `top_pages`. If it does not, **do not create it yet**; continue
   with a `{SITE_ID}` placeholder and include `create_site` in the plan. If a call fails
   for scope (`get_tracking_settings` needs write access) or `403 not_site_owner`, do not
   retry: say which permission is missing and continue.
2. **Audit, then cross-check with production.** Follow
   [audit-playbook.md](references/audit-playbook.md): mode and stack, routes, conversion
   surfaces, existing tracking (wrappers, dynamic names). The most valuable findings come
   from comparing code with data: events in code that never arrive, events that arrive
   with no code, goals that count intent instead of the outcome, paths with traffic served
   by another repo. Do not skip this step.
3. **Plan.** Score per [measurement-plan-template.md](references/measurement-plan-template.md):
   3 to 7 "start here" rows, the rest as "Later", within 8 new goals, 1 to 3 funnels,
   10 new events. Each row: what, type, trigger, file:line, exact name/definition, why,
   effort, status; then "Will NOT track" and the exact list of code edits and MCP writes.
4. **Confirm.** Get an explicit yes on the plan. MCP writes change a shared account, so
   list each one (`create_goal` ×N, `create_funnel` ×M, `update_tracking_settings`...)
   and do not run any before approval. Edits outside the approved list need a new yes.
   Goals are retroactive: editing an existing goal rewrites its history, so prefer a new
   goal next to it and compare.
5. **Implement code.** Reuse the repo's existing wrapper (`track()`, `analytics.ts`,
   a `TrackedLink` component) or add one thin guarded helper. Put the snippet in the
   right layout per [install-by-platform.md](references/install-by-platform.md). Check
   CSP allows `https://statable.com` in `script-src` and `connect-src`. Run the
   project's lint, type-check and build.
6. **Configure via MCP.** Now: features, pageview and scroll goals, and funnels whose
   event steps already arrive. After deploy, once the new event shows in
   `top_custom_events(period: "1d")`: event goals and funnels with new event steps
   (this catches typos; goals are retroactive, so waiting loses nothing). If deploy is
   later, list them as pending in `ANALYTICS.md`.
   - `update_tracking_settings` **replaces** the whole list: read, add, send the full list.
   - `update_goal` and `update_funnel` are full replaces too (an omitted funnel `scope` or
     `strict_order` resets); `create_*` refuses duplicate names.
   - Event goals must match the event name exactly, including case.
   - Funnel steps: always send both shapes, see [mcp-tools.md](references/mcp-tools.md#5-funnel-step-shape).
7. **Verify** after deploy, and say plainly what is and is not proven:
   - DevTools Network `api/event` or the Statable Debugger extension shows
     `"n":"[{Name}]"` (the tracker adds the brackets) with the right `p`. A **202 is
     not proof** (refused events also get 202); a 400 means a malformed payload or
     invalid name.
   - Automated browsers and privacy settings send nothing
     ([tracker-api.md](references/tracker-api.md#6-client-side-suppression)): verify in
     a normal browser.
   - Then `top_custom_events` (period `1d`), `list_prop_keys`, `top_goals`,
     `funnel_report`. Funnels and goals need real traffic before they show numbers.
8. **Record it.** Offer a short `ANALYTICS.md` (event, trigger file, props, goal,
   pending MCP writes) so future edits keep names stable.

## Without the MCP server

If the Statable tools are not available, do the audit and code changes the same way,
then give the user the goal, funnel and feature settings as dashboard steps, or use the
`statable` CLI or HTTP API described in [mcp-tools.md](references/mcp-tools.md).
Never ask the user to paste an API key into chat or commit one to the repo.
