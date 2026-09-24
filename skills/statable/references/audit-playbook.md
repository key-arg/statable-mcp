# Audit playbook

How to go from "here is my site" to the findings that feed the Measurement Plan.
The audit is read-only: no code edits and no MCP writes until the plan is approved.

## Contents

1. Mode detection
2. Account state (read-only MCP)
3. Codebase discovery
4. Existing tracking discovery
5. Live URL discovery (no code)
6. Several repos or an app on one site
7. Anti-patterns to flag

---

## 1. Mode detection

Decide without asking:

| Signal | Mode |
| --- | --- |
| cwd or a given path has `package.json`, `composer.json`, `Gemfile`, `manage.py`, `mkdocs.yml`, `hugo.toml`/`config.toml`, `_config.yml`, a WordPress theme or plugin, `*.liquid`, or `*.html` | **Codebase** |
| The user gave a URL or domain, or there is no web project here | **Live URL** |
| Codebase **and** a known production domain (`CNAME`, `site_url`, `NEXT_PUBLIC_SITE_URL`/`APP_URL` in `.env*.example`, sitemap `baseUrl`) | **Both:** plan from code, check against the live site |
| Wix, Webflow, Squarespace, hosted Shopify or Framer fingerprints | **Live, no code access:** paste-in markup, platform steps, URL-based goals |

Ask at most two questions, only when inference fails: the one action that makes the
site worth running, and which Statable site to use if `list_sites` is ambiguous.

## 2. Account state

If MCP is available, run the read-only snapshot from [mcp-tools.md](mcp-tools.md#6-recipes).
If the domain has no site, do not create it; plan with `{SITE_ID}` and list
`create_site` as a proposed write. Note the subscription status and whether the site is
a free (hobby) site, which changes the snippet.

## 3. Codebase discovery

Use ripgrep and exclude build output:
`-g '!node_modules' -g '!dist' -g '!build' -g '!.next' -g '!vendor' -g '!*.test.*'`.
Quote globs (zsh expands unquoted ones).

**Stack:** see [install-by-platform.md](install-by-platform.md). In a monorepo, check
each `apps/*` separately and find which one serves the public site.

**Route inventory.** Every route is a candidate pageview goal or funnel step.

- Next: `find app src/app -name 'page.*'`; route groups like `(marketing)` vs `(app)` separate public pages from the product.
- Nuxt / SvelteKit / Astro / Pages Router: `pages/**`, `src/routes/**/+page.svelte`, `src/pages/**`.
- Laravel `routes/web.php`, Django `urls.py`, Rails `config/routes.rb`.
- Static sites: the sitemap or its generator.

**Conversion surfaces:**

Patterns below are ripgrep regexes; `|` is alternation.

- **Signup / auth:** `rg -il 'signup|sign-up|register|createAccount'`; OAuth: `rg -n 'signIn\(|oauth|Continue with'`
- **Checkout / payment:** `rg -n 'stripe|checkout\.sessions|redirectToCheckout|Paddle|lemonsqueezy|paypal|mollie'`; return routes named `success|thank|confirm|order-received`
- **Pricing:** routes `pricing|plans`; toggles `rg -n 'annual|yearly|monthly|billing(Period|Cycle)'`
- **Forms:** `rg -ln '<form|useForm|onSubmit|handleSubmit|use:enhance|wire:submit|@csrf|csrf_token'`, then read each handler and find the **success branch** (`onSuccess`, `.then`, `if (res.ok)`)
- **Contact / demo / quote:** `rg -il 'contact|demo|quote|enquir|inquiry|talk-to-sales|book'`
- **Newsletter:** `rg -n 'newsletter|subscribe|mailchimp|convertkit|buttondown|beehiiv|brevo|klaviyo'`
- **Booking:** `rg -n 'calendly|cal\.com|savvycal|tidycal|acuity'`
- **`mailto:` / `tel:`:** `rg -n 'mailto:|tel:'` (not auto-tracked: need a tagged event)
- **Downloads:** `rg -n '\.(pdf|zip|dmg|exe|csv|xlsx)\b|download='` (auto-tracked: goal candidates only)
- **Outbound / app stores / affiliates:** `rg -n 'apps\.apple|play\.google|chromewebstore|wordpress\.org/plugins|ref=|affiliate'`
- **Shared CTA components:** `rg -l 'GetStarted|StartFree|CTA|Hero'`, then count uses per component
- **Search:** `rg -n 'type="search"|role="search"|algolia|docsearch|pagefind'`
- **404 / errors:** `not-found.*`, `404.*`, `error.*`, `templates/404.html`, `404.php`: is the `status:code` meta present?
- **Success states in the query string:** e.g. `/payment?status=success`: the query is stripped, so these need a distinct path or an event that waits for the script ([tracker-api.md](tracker-api.md#7-outcomes-on-page-load-after-a-redirect))
- **OAuth / SSO sign-up:** a click on "Continue with Google" is intent; the outcome happens after the provider redirect. Find where only new accounts land (`/onboarding`, `/welcome`) for a pageview goal
- **In-app activation (SaaS):** create / invite / connect / import / API key actions: `rg -n 'useMutation|onSuccess'` in app directories

**Security headers:** search for CSP as described in install-by-platform.md.

## 4. Existing tracking discovery

Search for wrappers, not only direct calls:

```bash
rg -n 'statable\??\.t\??\(|data-statable-event'
rg -l 'statable\??\.t'              # locate the wrapper file; note its exported name
rg -n '\btrack\('                   # every call to the wrapper (use its real name)
rg -n "\btrack\([^'\"]"              # dynamic names: ternaries, variables
rg -n 'event="[^"]+"'                # wrapper components such as <TrackedLink event="...">
```

Do not search only for string-literal calls: `track(mode === "signup" ? "Sign up completed" : ...)`
is where conversions often hide. Collect every branch of each ternary.

Also look for custom delegators (a site may use its own attribute such as `data-st-event`)
and other analytics tools ([migration-from-other-analytics.md](migration-from-other-analytics.md)).

Then **cross-check with production**: `top_custom_events(period: "90d", limit: 1000)`.

- Events in production but not in your grep: widen the search (sibling repos, CMS,
  GTM), then `git log -S '<name>' --oneline`. Removed code with a goal still on it is an
  **orphan goal** (hygiene: delete or redefine). Names like `Smoke check 813` are test
  noise.
- Events in code but never received: dead code, a disabled feature, or a branch that never runs.
- Events per visitor above ~5: page-load or loop firing (flag as hygiene).
- Goals whose event name does not match any received event (case included): broken goals.
- Goals on an intent event (a click before OAuth, a form submit) presented as the
  outcome: flag, and propose the outcome goal next to it.
- `list_prop_keys`: keys with camelCase, hyphens or high cardinality.
- `top_pages` first path segments with traffic but no route in this repo: they are
  served by another repo or a proxy (section 6).

## 5. Live URL discovery (no code)

1. Fetch the homepage with a browser user agent, a timeout and a size cap; retry with `www.`.
2. `robots.txt` → `Sitemap:` → `sitemap.xml` (follow indexes). Bucket URLs by first path
   segment; look for `pricing, signup, register, contact, demo, book, cart, checkout,
   thank, success, download, blog, docs`.
3. Extract `<a href>` and labels from the header, nav and footer; follow 3 to 10 key pages.
4. Forms: `<form` with `type="email"`, `action=` hosts (HubSpot, Formspree, Netlify,
   Contact Form 7, Gravity Forms, Elementor, WPForms).
5. Stack fingerprints: `/_next/`, `__NUXT__`, `data-astro-cid`, `wp-content`,
   `cdn.shopify`, `webflow.js`, `wixstatic`, `squarespace`, `framerusercontent`,
   the `generator` meta tag, `x-powered-by` / `server` headers.
6. Existing analytics snippets (see the migration reference).
7. Statable present? Look for `statable.com/js/` in the **rendered** HTML and count it.
8. A thin SPA shell (`<div id="root"></div>` with no links) needs a real browser. Ask
   before driving one, and remember such browsers usually send no events themselves.

## 6. Several repos or an app on one site

- **Several repos, one site id.** Docs, blog or tools often live in sibling repos. Compare
  `top_pages` segments with the route inventory; for the missing ones search the parent
  directory (`rg -l '<site_id>/s.js' ..`). List them in the plan as "outside this repo"
  and ask whether to audit them too.
- **Marketing and the logged-in app on one site.** Group dynamic app paths in goals and
  funnel steps with `b` (`/sites/`, `/share/`); never build goals on token paths
  (`/invite/<token>`). Suggest a separate Statable site for the app, or a hostname
  filter, when app events crowd the Custom Events report. Exclude the team with
  `analytics_ignore` or the IP blocklist (the team often dominates app traffic).

## 7. Anti-patterns to flag

1. Page-load "viewed" events in mount effects. Use a pageview goal or funnel page step.
2. Tracking every click (tabs, sorts, menu toggles). Each event needs a question it answers.
3. Intent vs outcome: firing the conversion on submit instead of on confirmed success.
4. Duplicate goals for one outcome (several names, or both a page and an event goal).
5. PII in props: emails, names, phones, IDs, free text, search queries, tokenized paths.
6. High-cardinality props: IDs, timestamps, raw URLs. Raw search text: replace with
   `length` or `results`.
7. Nested objects or arrays in props.
8. Reserved or auto names used manually; brackets or invalid characters in names.
9. `data-statable-url` inside links (silently overwritten).
10. Hyphenated attribute keys (`data-statable-user-id` → `userid`); camelCase keys from
    `t()`. Renaming a key splits history: rename with a comparison window, not silently.
11. Duplicate snippets, or `t()` in server code.
12. Query-string success states used as pageview goals.
13. A predefined `window.statable` stub ([tracker-api.md](tracker-api.md#1-javascript-api)).
14. Features the code relies on (`tagged`, `forms`, `scroll`, `status`, `props`) switched off.
