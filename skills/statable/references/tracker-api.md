# Tracker API reference

Behavior of the Statable tracking script (`s.js`), as implemented. Check the live
docs (https://statable.com/docs/developers/javascript-api/) for anything newer.

## Contents

1. JavaScript API: `window.statable.t`
2. Event name and property rules
3. Declarative tracking: `data-statable-event`
4. Script-tag attributes
5. Tracker features and auto events
6. Client-side suppression
7. Outcomes on page load after a redirect
8. Server-side events
9. Docs errata

---

## 1. JavaScript API

```ts
window.statable.t(name: string, props?: Record<string, string | number | boolean>): void
```

- Fire-and-forget: no return value, no callback, no promise.
- **Not queued.** Before the script initializes, `t()` is a silent no-op; before the
  script loads at all, `window.statable` is undefined. Always call it guarded:

```js
window.statable?.t?.('Sign Up Completed', { method: 'google' })
```

- **Never predefine `window.statable`**, for example as a queue stub. The tracker only
  assigns it when it is missing, so a stub stays in place and swallows every call.
  Some framework docs mention a "queue stub": ignore that.
- Call only in browser code: event handlers, success callbacks, client components.
  Never in server components, loaders, actions or SSR `setup`. For an event that must
  fire when a page loads (return from Stripe or OAuth), see section 7.

TypeScript declaration:

```ts
declare global {
  interface Window {
    statable?: { t: (event: string, props?: Record<string, unknown>) => void }
  }
}
export {}
```

A thin wrapper most projects want (adapt to the repo's existing helper if one exists):

```ts
export function track(name: string, props?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined') return
  window.statable?.t?.(name, props)
}
```

## 2. Event name and property rules

**Event names** (enforced by the server, not documented):

- Max 64 characters after trimming.
- Allowed characters: `A-Z a-z 0-9`, space, `_`, `-`. Regex: `^[a-zA-Z0-9_ -]*$`.
- Rejected with `invalid_event_name` (HTTP 400): dots, colons, slashes, `&`,
  apostrophes, parentheses, emoji, accented or other non-ASCII letters, empty names.
- Reserved: `pageview`, `engagement`. Auto names `Outbound Link Click` and
  `File Download` belong to the tracker; do not send them manually.
- Case-sensitive. `Sign up` and `Sign Up` are two different events and goals.
- Put variable data in props, not names: `Plan Changed {from, to}`.

Validate every planned name before writing code:

```js
const ok = n => n.length > 0 && n.length <= 64 && /^[a-zA-Z0-9_ -]+$/.test(n)
  && !['pageview', 'engagement'].includes(n)
```

**Properties:**

- Every value is stored as a string. Numbers and booleans arrive as `"49"`, `"true"`.
  Objects and arrays are stored as JSON text, so flatten them (`items: 3`, not `items: [...]`).
- Keys from `t()` are kept exactly. Prefer lowercase, one word: `plan`, `method`,
  `location`, `source`, `billing`.
- Keep cardinality low. IDs, timestamps and raw URLs make reports unreadable; the docs
  mention a per-site ceiling on distinct keys.
- No PII: see the Privacy section of SKILL.md.
- The request body cap is 64 KB.
- New keys show up within minutes; find them with MCP `list_prop_keys`. Dashboard
  filter name is `prop_<key>`.

## 3. Declarative tracking

### Clicks (feature `tagged`)

```html
<button data-statable-event="Sign Up Clicked" data-statable-plan="pro" data-statable-location="pricing">Start Pro</button>
<a href="mailto:sales@example.com" data-statable-event="Email Clicked" data-statable-location="footer">Email us</a>
```

- One capture-phase click listener on `document`. The **nearest** ancestor with
  `data-statable-event` wins, at any depth.
- Every other `data-statable-*` attribute **on the same element** becomes a prop. Keys
  are lowercased and hyphens removed: `data-statable-item-name` → `itemname`. Use
  single-word keys.
- A click inside an `<a>` adds a `url` prop (href without `?` and `#`). It
  **overwrites** any `data-statable-url` you set.
- There are no CSS-class triggers.

### Forms (feature `forms`)

```html
<form action="/api/subscribe" method="post" data-statable-event="Newsletter Signup" data-statable-source="footer">...</form>
```

- A `submit` listener on `document`; the form or an ancestor carries the attribute.
- Fires after native validation passes but **before and regardless of** server success,
  including for AJAX forms that call `preventDefault`. Use it for intent. For a
  confirmed conversion, call `t()` in the success handler and do not tag the form.
- Field values are never captured, only the attributes on the element.

## 4. Script-tag attributes

| Attribute | Behavior |
| --- | --- |
| `src="https://statable.com/js/{SITE_ID}/s.js"` | Site id is parsed from the path. Paid snippets have no `data-id`. |
| `data-id` | Fallback site id. Required by free (hobby) widget bundles `/js/{hash}/t/{widget}.js` and self-served copies. |
| `data-tracking-api` | Overrides the event endpoint (default `<script origin>/api/event`), e.g. for a first-party proxy. |
| `data-statable-{key}` | Props on **pageviews only**, never on custom events. Key is the raw suffix, hyphens kept. Needs feature `props`. |
| `data-before-send="fnName"` | Global function called per **pageview**: `(props) => props \| false`. `false` drops the pageview. Custom events bypass it. Needs feature `beforesend`. |
| `<meta name="status:code" content="404">` | On the error template. Feeds the Errors report (`event:status_code`). Needs feature `status`. |

Always take the snippet verbatim from MCP `get_tracking_snippet` (or the dashboard);
do not rebuild it from the site id, because hobby sites use a different URL.

## 5. Tracker features and auto events

Feature ids as returned by `get_tracking_settings`. The Standard preset enables all;
Nano is `core` + `spa`; anything else is Custom.

| id | Does | Produces | Requires |
| --- | --- | --- | --- |
| `core` (locked) | pageviews, privacy guards, `statable.t` | `pageview` | |
| `spa` | `pushState` / `replaceState` / `popstate` / bfcache | `pageview` when the **pathname** changes | |
| `props` | script-tag `data-statable-*` | props on pageviews | |
| `engagement` | active time | `engagement` | |
| `scroll` | max scroll depth | scroll depth on engagement | `engagement` |
| `heartbeat` | long-session pings | internal | `engagement` |
| `outbound` | clicks on `<a>` whose host differs from the page host (subdomains count) | `Outbound Link Click` + `url` | |
| `downloads` | `<a download>`, non-HTML `type`, or pdf, zip, rar, gz, tar, 7z, doc(x), xls(x), ppt(x), csv, exe, dmg, iso, mp3, mp4, avi, mov | `File Download` + `url` | |
| `tagged` | `data-statable-event` clicks | your event name | |
| `forms` | tagged form submits | your event name | |
| `status` | `status:code` meta tag | status code on pageview | |
| `beforesend` | `data-before-send` hook | | |

Notes:

- `mailto:` and `tel:` links have no host, so they are **not** outbound events. Tag them.
- A tagged external link is recorded twice: your event and `Outbound Link Click`. Pick
  one per link: the tag when you need a name or props (accept the extra auto event), or
  the auto event with an event goal on `Outbound Link Click` (which cannot filter by
  `url`, so it counts every outbound click).
- Hash routes (`#/page`) and query-only changes are not new pageviews, and fragments are
  stripped server-side. Recommend history-mode routing instead of manual pageviews.
- Turning a feature off stops collection with no backfill. Changes reach visitors in
  about an hour; the snippet URL does not change.
- Consider switching `forms` off on sites with sensitive enquiries (medical, legal)
  and firing a success event instead.

## 6. Client-side suppression

Nothing is sent when any of these is true, and the guards cannot be disabled:

- `navigator.webdriver` (Playwright, Puppeteer, Selenium, most agent-driven browsers) or `window.Cypress`
- `navigator.globalPrivacyControl === true`
- Do Not Track `'1'` / `'yes'`
- `localStorage.analytics_ignore === 'true'` (the documented way to exclude your own visits)

The server answers `202` even for events it then refuses (wrong site id, blocked IP or
country, hobby hostname mismatch, a `file://` page with no hostname, a site created less
than a minute ago), so a 202 proves nothing. A `400` means a malformed
payload or an invalid event name. Confirm in Realtime or with MCP reads.

## 7. Outcomes on page load after a redirect

The exception to "no page-load events": a success that exists only as the page the user
returns to (Stripe `?status=success`, OAuth callback). A `t()` in a mount effect usually
runs **before** the script has loaded (`next/script` `afterInteractive`, `defer`), and
since calls are not queued the event is lost silently. In order of preference:

1. **A distinct path** only the outcome reaches (`/payment/success`, `/onboarding` for new
   accounts) and a pageview goal on it. No code, retroactive, cannot be lost.
2. **Wait for the script**, then fire once:

```ts
function trackWhenReady(name: string, props?: Record<string, string>, key = name) {
  if (sessionStorage.getItem(key)) return            // reload guard
  const started = Date.now()
  const tick = () => {
    if (window.statable?.t) { window.statable.t(name, props); sessionStorage.setItem(key, '1') }
    else if (Date.now() - started < 10000) setTimeout(tick, 200)
  }
  tick()
}
```

   With `next/script`, the `onLoad` callback of the Statable `<Script>` is an alternative.
3. A one-time flag (query param or short-lived cookie) set by the backend after the
   real outcome, consumed by option 2 on the landing page. Use it when intent and outcome
   share a URL, e.g. OAuth sign-in vs sign-up.

## 8. Server-side events

There is no supported server-side ingestion API. `/api/event` is the tracker's wire
format: the visitor is identified from the browser request, so a POST from a server would
not join the visitor's session or funnels, and datacenter IPs are flagged as bot traffic
and excluded from reports. For outcomes only the backend knows (webhooks, activation),
surface them to the browser (section 7, option 3) or record them as a plan gap.

## 9. Docs errata

Where the docs say otherwise, this file reflects the tracker's actual behavior:

- Script-tag `data-statable-*` props go to pageviews only, not "every event".
- `data-before-send` receives pageview props only, not per-call props.
- Nested objects are accepted but stored as JSON text.
- Tagged forms fire on submit even when the handler calls `preventDefault`.
- Paid snippets have no `data-id`.
- The event-name character set and 64-character limit are not documented.
