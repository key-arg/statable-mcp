# Install and event idioms by platform

The canonical tag is whatever `get_tracking_snippet` (or the dashboard) returns, placed
once in `<head>`:

```html
<script defer src="https://statable.com/js/{SITE_ID}/s.js"></script>
```

Free (hobby) sites use a widget bundle with `data-id`; install it verbatim. Optional:
`<link rel="preconnect" href="https://statable.com" crossorigin>`. Always read the
matching live page `https://statable.com/docs/install/<platform>/` before editing.

## Cross-cutting checks

- **Already installed?** Search for `statable.com/js/` in source, and in the rendered
  HTML for CMS sites (themes, header-script fields and plugins can inject it). More than
  one tag on the same page: the second is ignored, so flag it.
- **CSP:** search `Content-Security-Policy|script-src|connect-src` in framework config,
  middleware, `_headers`, `vercel.json`, `netlify.toml`, `nginx.conf`, `helmet(`. Allow
  `https://statable.com` in `script-src` and `connect-src` (or the proxy host when
  `data-tracking-api` is set).
- **SSR:** `window.statable` exists only in the browser. Guard every call and never fire
  from server code.
- **Hydration:** calls are not queued, so events fired during hydration or in a mount
  effect are usually lost. Tie events to user actions or confirmed results; for outcomes
  on page load see [tracker-api.md](tracker-api.md#7-outcomes-on-page-load-after-a-redirect).
- **Existing wrapper first:** extend `track()` / `useAnalytics` / `TrackedLink` if present.
- **Tests:** automated browsers send nothing (`navigator.webdriver`), so E2E runs do not
  pollute data and cannot be used to verify it.

## Frameworks

| Stack (signals) | Snippet location | Event idiom and caveats |
| --- | --- | --- |
| **Next.js App Router** (`next`, `app/layout.tsx`) | `import Script from 'next/script'`; `<Script src={\`https://statable.com/js/${process.env.NEXT_PUBLIC_STATABLE_ID}/s.js\`} strategy="afterInteractive" />` in the root layout. Also in `global-not-found.tsx` if present (it bypasses the root layout). Building the URL from an env id fits paid sites only; a hobby site uses a different URL, so paste its snippet verbatim. | The `NEXT_PUBLIC_` prefix is required, or the URL becomes `/js/undefined/s.js`. Calls only in `'use client'` components through a guarded `lib/track.ts`. Navigation is automatic: never send pageviews from `usePathname` effects. 404: `export const metadata = { other: { 'status:code': '404' } }` in `not-found.tsx`. |
| **Next.js Pages Router** (`pages/_app.tsx`) | Same `<Script>` in `_app.tsx`, not `_document.tsx`. | Same as above. |
| **Nuxt 3** (`nuxt.config.*`) | `app.head.script: [{ src, defer: true }]` in `nuxt.config.ts` with the id from `runtimeConfig.public`, or `useHead` in `app.vue`, or `useScript(..., { trigger: 'onNuxtReady' })`. | A `plugins/statable.client.ts` or `useStatable()` composable; guard with `import.meta.client`; call in handlers or `onMounted`, never in SSR `setup`. Do not depend on a Nuxt Scripts registry entry unless the live docs list it. |
| **Vite (any)** | `index.html` `<head>`, or the npm package `statable-analytics`: `import statable from 'statable-analytics/vite'`, `plugins: [statable({ siteId: '...' })]`. | Plugin options: `siteId`, `host`, `trackingApi`, `beforeSend`, `props`, `dev` (default false: no tag in dev server), `disabled`. |
| **React SPA** (Vite, CRA) | `index.html`, or env substitution (`%VITE_STATABLE_ID%`). | History routers are tracked automatically. A thin `track()` util. |
| **Vue 3** | `index.html` (recommended) or `useHead`. | `createWebHashHistory` is not tracked per route: recommend `createWebHistory`. |
| **Astro** (`astro.config.*`) | `import statable from 'statable-analytics/astro'`, `integrations: [statable({ siteId })]`, or in the shared layout `<script is:inline defer src="...">`. | Without `is:inline` Astro bundles the tag and it never loads. Prefer `data-statable-event` on static markup; islands call `window.statable?.t?.()`. View transitions are tracked. |
| **SvelteKit** | `src/app.html` `<head>`. | `import { browser } from '$app/environment'`; fire in click handlers or in `use:enhance` when `result.type === 'success'`. |
| **Remix / React Router 7** | `<script defer>` in `app/root.tsx` `<head>`. | Fire after the action succeeds (`useActionData`, `useFetcher().data`), not on submit. |
| **Angular** | `src/index.html`. | Injectable `AnalyticsService`; guard with `isPlatformBrowser` under SSR. |
| **Gatsby** | `gatsby-ssr.js` `onRenderBody` → `setHeadComponents`. | `typeof window !== 'undefined'` guard. |
| **Hugo / Jekyll / 11ty / MkDocs** | Head partial: `layouts/partials/head.html`, `_includes/head.html`, base layout, MkDocs `overrides/main.html` `extrahead` block. | `data-statable-event` in templates and shortcodes. MkDocs `attr_list`: `[Start trial](/signup){ data-statable-event="Blog CTA Click" data-statable-position="footer" }`. With instant navigation, guard delegated listeners against double binding. |
| **Laravel / Django / Rails** | Main layout `<head>` (`layouts/app.blade.php`, `templates/base.html`, `layouts/application.html.erb`). | `data-statable-event` in templates. Server-rendered success (flash message): emit a small inline script after the snippet that calls `window.statable?.t?.('Lead Submitted')` after `DOMContentLoaded`. Rails Turbo Drive visits are covered by `spa`; Stimulus controllers call `t()`. |
| **Plain HTML** | Every page's `<head>`; grep that each page has exactly one. | `data-statable-event` everywhere. |

## CMS and builders

| Platform | Install | Events |
| --- | --- | --- |
| **WordPress** | Official plugin "Statable Analytics" (wordpress.org/plugins/statable-analytics): connects by emailed code, excludes roles, detects duplicate tags. Manual fallback: `wp_enqueue_script` with `['strategy' => 'defer']` in a child theme. | `data-statable-event` markup in blocks, or `wp_add_inline_script('statable-analytics', "...")`. Exclude `s.js` from minify/combine in caching plugins. WooCommerce thank-you: pageview goal `b` + `/checkout/order-received/`. |
| **Shopify theme** | `layout/theme.liquid` `<head>`. | Checkout pages are outside the theme: a thank-you pageview goal only works if the tag runs there. Otherwise track `Checkout Started` on the cart and rely on the cart pageview. |
| **Wix** | The Statable app in the Wix App Market (paste the Site ID), or Settings → Custom Code in head. | Counting starts after publishing. The app is categorized as analytics, so visitors who decline the Wix cookie banner are not counted; Custom Code can be set to Essential. For events, a delegated `document.addEventListener('click', ...)` in Body-End. |
| **Webflow** | Site settings → Custom code → Head. | Custom attributes `data-statable-event` on elements. |
| **Squarespace** | Settings → Code Injection → Header. | Code blocks with tagged markup; mostly pageview goals on thank-you URLs. |
| **Google Tag Manager** | Custom HTML tag with the snippet on All Pages, or the Statable community template if the live docs say it is available. | The template cannot set `data-statable-*`, `data-before-send` or `data-tracking-api`; a Custom HTML tag can. Hobby sites unsupported. Often blocked by ad blockers, which loses privacy-conscious visitors: prefer direct install when possible. dataLayer bridge: see below. |

GTM dataLayer bridge (as in the live docs): a Custom HTML tag on a Custom Event trigger
`sa_event`, plus two Data Layer Variables, `event_name` (reads `name`) and `event_props`
(reads `props`):

```html
<script>window.statable && window.statable.t({{event_name}}, {{event_props}} || {})</script>
```

with the app pushing:

```js
dataLayer.push({ event: 'sa_event', name: 'Sign Up Completed', props: { method: 'email' } })
```

For hosted builders without code access, the plan relies on pageview goals for
thank-you URLs, auto outbound and download tracking, and tagged markup the user pastes.
