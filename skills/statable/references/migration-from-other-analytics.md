# Migrating from other analytics tools

Use this when the audit finds another analytics tool. Read the live docs for any
official import (https://statable.com/llms.txt lists them).

## Detection

Snippet patterns are regexes to run against HTML or source:

- **GA4:** snippet `gtag/js\?id=G-` ; events `gtag\(\s*['"]event['"]\s*,\s*['"]([^'"]+)`
- **Google Tag Manager:** snippet `googletagmanager\.com/gtm\.js|GTM-[A-Z0-9]{4,9}` ; events `dataLayer\.push\(\s*\{[^}]*event\s*:\s*['"]([^'"]+)`
- **Plausible:** snippet `plausible\.io/js|plausible\.js` ; events `plausible\(\s*['"]([^'"]+)`, `plausible-event-name=`
- **Fathom:** snippet `cdn\.usefathom\.com` ; events `fathom\.trackEvent\(|fathom\.trackGoal\(`
- **Umami:** snippet `umami\.is/script\.js|/umami\.js` ; events `umami\.track\(`, `data-umami-event=`
- **Matomo:** snippet `matomo\.(js|php)|piwik\.(js|php)` ; events `_paq\.push\(\[\s*['"]trackEvent['"]`
- **Mixpanel:** snippet `cdn\.mxpnl\.com|mixpanel\.init` ; events `mixpanel\.track\(`
- **PostHog:** snippet `posthog\.init|i\.posthog\.com` ; events `posthog\.capture\(`
- **Segment:** snippet `cdn\.segment\.com|analytics\.load\(` ; events `analytics\.track\(`
- **Simple Analytics:** snippet `scripts\.simpleanalytics` ; events `sa_event\(`
- **Ad pixels** (Meta `fbq\(`, others): marketing pixels, not migrated. Note them only.

## Mapping rules

- **Each distinct event name → one Statable custom event.** From tools with
  human-readable names (Plausible, Umami, Fathom), keep the same name when it passes the
  name rule, so continuity is obvious. Replace invalid characters (`.`, `:`, `/`, `&`).
- **GA4 recommended events:**
  - `sign_up` → `Sign Up` (or the site's existing outcome name)
  - `generate_lead` → `Lead Submitted`
  - `begin_checkout` → `Checkout Started`
  - `purchase` → `Purchase`
  - `file_download` → drop it: the auto `File Download` covers it
  - outbound `click` → drop it: the auto `Outbound Link Click` covers it
- **Parameters → properties.** Keep only low-cardinality ones (`method`, `plan`,
  `currency`, a numeric value). Drop `transaction_id`, `items[]` (arrays are stored as
  JSON text), and anything identifying a user.
- **Conversions / key events / goals → Statable goals.** A URL-based conversion becomes
  a pageview goal with `e`, `b` or `c`; remember there are no wildcards and no query strings.
- **Dual-send first.** Add the Statable call inside the existing wrapper or next to each
  old call, so both tools run in parallel for a comparison window. Offer to remove the
  old tool only after the user has compared numbers; never remove it unprompted.
- **GTM sites:** use a Statable tag per existing trigger, or the dataLayer bridge in
  [install-by-platform.md](install-by-platform.md). Mention that direct install avoids
  GTM being blocked.
- **History:** check the live docs for a Google Analytics import. Any import covers
  aggregated reports, not custom events or goals, which start from native data.
- Expect different numbers: Statable counts without cookies and respects GPC and DNT,
  so totals will not match cookie-based tools exactly. Compare trends, not absolutes.
