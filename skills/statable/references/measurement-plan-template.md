# Measurement Plan: scoring, format, worked example

## Scoring

`priority = value (1-5) × confidence (0.5-1) ÷ effort (1-3)`

- **Value 5:** revenue or the primary conversion (purchase, paid signup, lead).
  **4:** signup or activation. **3:** strong intent (pricing view, checkout start, demo
  open, install copy). **2:** engagement (article read, search). **1:** curiosity; do
  not propose by default.
- **Effort 1:** configuration only (goal or funnel on an existing URL or event, feature
  toggle). **2:** a markup attribute or one `t()` in an existing handler. **3:** a new
  wrapper, a new success state, or a backend change.
- **Hygiene value** (same table, same formula): **4** a broken or misleading conversion
  (goal on intent, event that never arrives, orphan goal), **3** PII in names or props,
  **2** noise (high events per visitor, camelCase keys). Fixing bad data often beats
  adding new data.
- **Order:** effort-1 items with value ≥ 3 first ("free wins"), then value-5 items, then
  the rest.
- **Size:** the table shows **3 to 7 "Start here" rows**; everything else goes under
  **Later** as one line each. The whole plan stays within **8 new goals, 1 to 3 funnels,
  10 new events**, and the site's total goals stay readable (about 10 to 12): if the site
  already has many, consolidate before adding.

## Format

Show this **before** any code edit or MCP write, then ask for approval.

```markdown
## Measurement Plan: {domain} ({business type}, {stack})
Statable site: {name} (#{id}) · now: {n} goals, {m} funnels, {k} custom events in 30d, preset {Standard/Nano/Custom}
Naming: {existing convention, or Title Case for new sites}

| # | What | Type | Trigger | Where in code | Name / definition | Why (business question) | Effort | Status |
|---|------|------|---------|---------------|-------------------|-------------------------|--------|--------|
| 1 | ... | goal / event / funnel / prop / feature / hygiene | ... | path:line | ... | ... | 1-3 | new / exists / fix |

Later: #8 ..., #9 ...

Will NOT track (and why): ...

After you approve I will:
- Edit: {files}
- MCP: create_goal ×N, create_funnel ×M, update_tracking_settings (full list: ...)
- Verify: {how}
```

Keep "Why" to one business question per row. If a row cannot name one, drop the row.

## Worked example: a B2B SaaS on Next.js

A fictional `example.com`: a project-management SaaS with a free trial and Stripe
Checkout. Everything below is the kind of finding the audit produces.

**Findings**

- Stack: Next.js App Router, route groups `(marketing)` and `(app)`. Snippet in
  `app/layout.tsx` via `next/script`, `afterInteractive`. No CSP. `global-not-found.tsx`
  exists without the snippet.
- Existing tracking: wrapper `lib/track.ts` (guarded), 14 `track()` calls. Production
  shows 19 custom events in 30 days: the extra 5 come from a `<TrackedButton event="...">`
  component the first grep missed.
- Statable (read-only MCP): Standard preset, 3 goals (`Signup Google`, `Signup Email`,
  `Signup GitHub`), no funnels.
- Volume signals: `Upgrade Banner Viewed` fires 7.9 times per visitor (on every render);
  `Checkout Started` fires, but `/billing?status=success` has no event at all. The
  signup form is email-only; the three per-method goals count button clicks.
- Marketing: a shared `<StartTrialButton>` is used on 18 public pages and is untracked.
  `mailto:sales@example.com` on the pricing page is untracked (not auto-tracked).
- A newsletter form in the footer posts via `fetch` and shows a toast on success.

**Plan: start here**

| # | What | Type | Trigger | Where in code | Name / definition | Why | Effort | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Paid conversion | fix + goal | Stripe return with `status=success` | `app/(app)/billing/page.tsx:22` | Point Stripe's `success_url` at a new route `/billing/success`; goal `Subscription Started` = path `/billing/success`, `e`. (If the URL cannot change: `trackWhenReady('Subscription Started', { plan, billing })`, never a bare `t()` in the mount effect, which fires before the script loads.) | How many trials convert to paid? Query-string success cannot be a pageview goal. | 2 | new |
| 2 | Signup outcome | event + goal | account created (success branch) | `app/(auth)/verify/VerifyForm.tsx:48` | `t('Sign Up Completed', { method: 'email' })`; goal `Sign Up Completed` = event, created after the event is seen | How many people actually finish signup? | 2 | new |
| 3 | Goals on intent | hygiene | three per-method goals count clicks | none (config) | Keep #2 as the outcome; rename the old goals "... Clicked" or delete them in the dashboard after a comparison window | Four overlapping goals look like four conversions. | 1 | fix |
| 4 | Pricing intent | goal | pageview | none | `Pricing Viewed` = path `/pricing`, operator `e` | How many visitors consider buying? | 1 | new |
| 5 | Revenue funnel | funnel | | none | `Upgrade`: page `/pricing` → event `Checkout Started` → page `/billing/success` | Is checkout the leak, or the pricing page? | 1 | new |
| 6 | Banner noise | hygiene | fires on every render | `components/UpgradeBanner.tsx:17` | Remove; the click event `Upgrade Clicked` already carries the signal | 7.9 per visitor distorts the Custom Events report and consumes event quota. | 2 | fix |
| 7 | 404 page coverage | fix | not-found render | `app/global-not-found.tsx` | Add the snippet (it bypasses the root layout) and `status:code` 404 metadata | Which broken links are costing visitors? | 2 | fix |

**Later:** #8 funnel `Trial Signup` (page `/pricing` → page `/signup` → event
`Sign Up Completed`) once #2 arrives; #9 `Start Trial Clicked {location}` on
`StartTrialButton` (18 call sites: add a `location` prop defaulting to `unknown`, effort 3);
#10 `Email Clicked {location}` on the pricing `mailto:`; #11 `Newsletter Signup
{source}` in the footer form's success branch (not a tagged form, which fires before
success).

**Will NOT track:** in-app tab switches and table sorts (no business question);
search query text (PII risk); the Stripe-hosted checkout pages (out of reach).

**After approval:** add `app/(app)/billing/success/page.tsx`; edit 5 files
(`billing/page.tsx`, the checkout handler's Stripe `success_url`, `VerifyForm.tsx`,
`UpgradeBanner.tsx`, `global-not-found.tsx`); MCP now: `create_goal` ×2 (#1, #4),
`create_funnel` ×1 (#5); after deploy, once `Sign Up Completed` shows in
`top_custom_events(period: "1d")`: `create_goal` ×1 (#2). No feature change (Standard
already has `tagged` and `status`). Goal changes for #3 are dashboard steps (MCP cannot
delete). Verify with the Debugger, then `top_custom_events(period: "1d")` and
`list_prop_keys` after deploy.
