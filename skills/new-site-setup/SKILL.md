---
name: new-site-setup
description: Sets up a new website in Statable end to end: creates the site, returns the tracking snippet to install, configures goals for the actions that matter and builds a funnel across them. Use when someone wants to start measuring a site, add a project to Statable, install analytics, or set up conversion goals and funnels.
license: MIT
metadata:
  author: Key Arg B.V.
  product: Statable
---

# New site setup

Get a site from nothing to a working dashboard in one pass.

## Steps

1. Ask for the domain if it was not given. One site is one domain.
2. Call `create_site` with that domain. The response carries the numeric site id.
3. Call `get_tracking_snippet` and hand the snippet over as the next action for a person: one script tag before the closing head tag. For WordPress, point at the official plugin instead of the raw snippet.
4. Ask which actions count as success on this site, then create them with `create_goal`. Typical ones are a signup, a purchase, a contact form submit, or a visit to a thank-you page.
5. If the goals form a sequence, build it with `create_funnel` so the drop-off between steps becomes visible.
6. Check `get_tracking_settings` and confirm which features are on: outbound clicks, file downloads, scroll depth, engagement time. Turn on only what the person will actually read.
7. Verify with `current_visitors` once the snippet is live. Zero right after installation is normal on a quiet site, so say that instead of declaring it broken.

## Rules

- Do not invent goal names. Use the wording the person uses for the action.
- Statable sets no cookies and stores no persistent visitor identifier, so nothing here needs a consent banner for analytics. Do not promise legal outcomes beyond that technical fact.
- Creating and configuring sites needs write permission on the key or the OAuth scope. If a call is refused, explain which permission is missing rather than retrying.
