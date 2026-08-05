# Casa Gaviota admin UI pass

## Scope guardrails

- Visual/presentational files only. No API routes, database queries, status transitions, HostHub sync behavior, or payment-link behavior were changed.
- No dependencies added. The pass uses the existing Astro components and CSS/Tailwind setup.
- The supplied Casa Gaviota brand board is the visual reference: deep brown, terracotta, sand, dusty rose, and muted coastal blue, used more functionally than on the public site.

## Decisions

### Foundation and navigation

- Established a compact type hierarchy with guest/record names as the strongest anchor, section headings second, metadata third, and uppercase pills last.
- Reworked the global palette around warm off-white surfaces, deep brand brown, terracotta, sand, and coastal blue while keeping body text at high contrast.
- Standardized 44px interactive targets, focus-visible rings, form states, card radii, spacing, and 160–180ms transitions.
- Made the admin header sticky and simplified its mobile layout so it remains useful without crowding.
- Kept native/system fonts for speed and reliability; the admin is an operational tool, so no external font request was added.

### Status system

- Statuses are visually differentiated with label, color, border treatment, and a small leading state marker rather than hue alone.
- `lost` uses an × marker and dashed outline; `cancelled` uses a slash marker and solid muted-red outline, distinguishing the two terminal red states.
- Status values and transition logic remain unchanged.

### Dashboard and lists

- Filter pills now remain in one horizontal, momentum-scrolling row on mobile, with a sticky row below the sticky header and an unmistakable dark active state.
- Added counts to every filter using records already fetched for the page; no query was added or changed.
- Reordered list-card hierarchy to guest name → type/channel → dates and guest count → balance, with status/actions alongside or below on mobile.
- Tightened rows for 20+ item scanning while preserving 44px action targets and added hover, press, and keyboard focus feedback.
- Added tailored empty states for the unified, filtered, completed, drinks, and arrivals views.
- Added a lightweight skeleton during the existing HostHub sync request and an aria-live confirmation chip; sync behavior itself is unchanged.

## Logic-boundary TODOs

- Intent exists on the Add Lead form, but the dashboard's existing list query does not fetch `guest_intent`. Showing intent on list cards would require a data/query change, so it was deliberately not added here. A future logic-approved pass can expose the already-stored field to the presentational list item.
- A true network-aware skeleton after HostHub sync would require changing the current refresh/data lifecycle. This pass provides immediate in-button progress and confirmation feedback without changing sync behavior.

## Verification log

- Build and viewport checks will be recorded per commit below.
