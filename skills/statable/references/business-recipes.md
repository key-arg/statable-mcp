# Business-type recipes

Starting points, not templates to copy whole. Pick what the audit actually found,
keep the site's existing naming style, and cap the first plan (see
[measurement-plan-template.md](measurement-plan-template.md)).

Legend: **G** goals, **F** funnels, **E** events with properties, **Features** tracker features.
Event names are shown in Title Case; adapt them to the site's existing convention
(sentence case: `Checkout started`). Property keys are lowercase single words. All names pass
the event-name rule (letters, digits, space, `_`, `-`; max 64).

## SaaS

- **G:** `Sign Up Completed` (event, on confirmed account creation; for OAuth/SSO sign-up,
  a pageview goal on the page only new accounts reach, e.g. `/onboarding`);
  `Subscription Started` (pageview goal on a dedicated success path, or an event on
  confirmed payment); `Pricing Viewed` (pageview `/pricing`, `e`);
  `Demo Requested` (event).
- **F acquisition:** page `/` → page `/pricing` → page `/signup` → event `Sign Up Completed`.
- **F revenue:** page `/pricing` → event `Checkout Started` → event `Subscription Started`.
- **F activation:** event `Sign Up Completed` → event for the core object (`Project Created`)
  → event for the first value moment (`Integration Connected`, `Invite Sent`).
- **E:** `Sign Up Completed {method}`, `Checkout Started {plan, billing}`,
  `Subscription Started {plan, billing}`, `Plan Changed {from, to}`,
  `Get Started Clicked {location}`, `Invite Sent`, `API Key Created`,
  `Integration Connected {provider}`.
- **Features:** Standard. `forms` only matters if marketing forms are tagged.
- Hosted checkout (Stripe, Paddle) and OAuth pages are out of reach: fire
  `Checkout Started` on the redirect; for the outcome prefer a dedicated return path with
  a pageview goal, else an event that waits for the script
  ([tracker-api.md](tracker-api.md#7-outcomes-on-page-load-after-a-redirect)).
- A goal on the "Continue with Google" click measures intent, not accounts.

## E-commerce

- **G:** `Purchase` (event on the confirmation page, or pageview on a confirmation path
  like `/checkout/success`); `Add To Cart` (event); `Checkout Started` (event, or pageview
  `/checkout` with `b`).
- **F:** page `/products/` (`b`) → event `Add To Cart` → page `/cart` → event
  `Checkout Started` → event `Purchase`, visitor scope.
- **E:** `Add To Cart {category, price}`, `Purchase {currency, items}` (items as a count),
  `Coupon Applied {valid}`, `Filter Used {facet}`, `Search {results}` (the count, never
  the query).
- **Features:** Standard; `downloads` for catalogs or size charts.
- There is no revenue sum. An `amount` or `amount_band` prop gives counts per value only.
- WooCommerce: pageview goal `b` + `/checkout/order-received/`. Shopify: see
  [install-by-platform.md](install-by-platform.md).

## Lead generation, agencies, local business

- **G:** `Lead Submitted` (event on form success); `Call Clicked` and `Email Clicked`
  (tagged `tel:` / `mailto:` links, which are not auto-tracked); `Booking Started`
  (tagged booking button; the outbound click to the booking tool is also auto-tracked);
  `Contact Viewed` (pageview `/contact`).
- **F:** entry_page (service page) → page `/contact` → event `Lead Submitted`.
- **E:** `Lead Submitted {form, service}`, `Call Clicked {location}`,
  `Directions Clicked`, `Quote Calculator Used`.
- **Features:** Standard. For sensitive enquiries (medical, legal) consider turning
  `forms` off and firing only on success.

## Content, blog, media

- **G:** `Article Read` (scroll depth 75); `Newsletter Signup` (event);
  `Blog CTA Click` (event); `Subscribe` for paid media.
- **F:** entry_page (a post, `b` + `/blog/`) → event `Blog CTA Click` → page `/signup`.
- **E:** `Newsletter Signup {source}` (inline, footer, popup), `Share {network}`,
  `Blog CTA Click {position, post}` (post as a slug, not the title).
- **Features:** `engagement` and `scroll` are essential; `heartbeat` helps long reads.

## Docs, developer tools, open source

- **G:** `Install Command Copied` (event); `GitHub Clicked` (tagged star button);
  `Quickstart Completed` (pageview on the last quickstart page); downloads via the auto
  `File Download` event as an event goal.
- **F:** page `/docs/` (`b`) → page `/docs/quickstart` → event `Install Command Copied`.
- **E:** `Code Copied {lang}`, `Docs Search {results}`, `Docs Feedback {helpful}`,
  `Version Switched {to}`.
- **Features:** Standard; `status` + a 404 meta tag catches broken docs links.

## Marketplace

- **G:** `Listing Created` (supply), `Contact Seller` or `Booking Requested` (demand),
  `Sign Up Completed {role}` (buyer, seller).
- **F demand:** entry_page → page `/search` → page `/listing/` (`b`) → event `Contact Seller`.
- **F supply:** page `/sell` → event `Sign Up Completed` → event `Listing Created`.
- **E:** `Search {category, results}`, `Filter Applied {facet}`, `Listing Created {category}`,
  `Message Sent`.

## Nonprofit

- **G:** `Donation Completed` (event or thank-you pageview), `Volunteer Signup`,
  `Newsletter Signup`, `Petition Signed`.
- **F:** page `/donate` → event `Donation Started {frequency}` → event
  `Donation Completed {frequency, amount_band}`. Use bands, never exact amounts tied to people.
- **E:** `Donate Clicked {location}`, `Share {network}`; report downloads are auto-tracked.

## Every site type

- 404 tracking: `status:code` meta on the error template (feature `status`).
- Outbound links and downloads: already automatic; promote to goals only when they matter.
- Exclude the team's own visits: `localStorage.setItem('analytics_ignore', 'true')`
  in their browsers, or the IP blocklist.
