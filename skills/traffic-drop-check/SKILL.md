---
name: traffic-drop-check
description: Investigates a fall or spike in website traffic recorded by Statable by comparing periods and breaking the change down by source, page, country, device and campaign until the responsible segment is found. Use when someone says traffic dropped, visitors fell, a page lost traffic, numbers look wrong, or asks what happened to a website after a specific date.
license: MIT
metadata:
  author: Key Arg B.V.
  product: Statable
---

# Traffic drop check

Find the segment that carries the change instead of describing the total.

## Steps

1. `list_sites` to identify the site, then agree the two windows: the affected period and the comparable one before it. If the person named a date, put the break in the middle.
2. `query_stats` with `metrics: ["visitors", "pageviews", "visits", "bounce_rate"]` and `compare` set to the earlier window. Note the size of the change in absolute numbers, not only percent.
3. Break the same window down one dimension at a time with `query_stats`, comparing each against the earlier window: source, page, country, device, browser, and UTM campaign, medium and source when campaigns are in use.
4. Stop at the dimension where one or two rows account for most of the change. That is the answer, the rest is noise.
5. If goals are configured, check `top_goals` and `funnel_report` to see whether conversions fell with the traffic or held.

## Common findings worth naming

- One referrer or campaign disappeared while everything else held.
- One page lost traffic after a URL change, and a near-identical path gained it.
- A single country or device segment moved, which usually points at a crawler, a block, or a rendering problem.
- Traffic held but conversions fell, which moves the question from acquisition to the page itself.
- The tracking script stopped firing on part of the site. Check `get_tracking_settings` and `get_site_filters` before blaming the audience.

## Rules

- Never explain a drop with a cause the data does not show. Say which segment moved and what it does not explain.
- Check whether a site filter or an excluded IP range was changed in the same period before concluding the traffic is gone.
- Numbers are in the site timezone, and a period that includes today is incomplete. Say so when it matters.
