---
name: weekly-traffic-report
description: Builds a weekly traffic report for a site tracked with Statable: visitors and pageviews against the previous week, where the traffic came from, which pages carried it, which goals converted and how engaged people were. Use when someone asks how a website did last week, wants a Monday summary, or asks what changed in traffic since the previous period.
license: MIT
metadata:
  author: Key Arg B.V.
  product: Statable
---

# Weekly traffic report

Produce a short report a person can read in a minute, not a dump of every number.

## Steps

1. Call `list_sites` and pick the site. If several match, ask which one before continuing.
2. Call `query_stats` for the last 7 days with `metrics: ["visitors", "pageviews", "visits", "bounce_rate", "visit_duration"]` and `compare: "previous_period"`. The compare block carries the change in percent, use it instead of computing deltas by hand.
3. Call `top_sources`, `top_pages` and `top_countries` for the same window, 5 rows each.
4. Call `top_goals` for the same window. If the site has no goals, say so once and skip the section rather than inventing conversions.
5. If the report is for a live day, add `current_visitors` for context.

## What the report says

- One opening line: visitors last week and the change against the week before.
- Sources: the three that moved the most, with the direction of the change.
- Pages: the three with the most pageviews, and any page that appeared out of nowhere.
- Goals: conversions and conversion rate, or a note that no goals are configured.
- Engagement: bounce rate and average visit duration, only if they changed meaningfully.
- One closing line naming the single thing worth looking at this week.

## Rules

- All numbers come back in the site timezone. Do not re-adjust them.
- Report what the data shows. If a change has no visible cause in the breakdowns, say that plainly instead of guessing a reason.
- Statable stores no persistent visitor identifier, so there is no per-person history to report. Do not imply one exists.
