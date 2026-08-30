# Casa Gaviota hospitality science playbook

This doc collects the behavioral-science and hospitality-research concepts worth deliberately applying to Casa Gaviota, maps each one to what already exists in the codebase/business today, and tracks experiments run to test them. It complements the other two sales docs rather than replacing them:

- `docs/sales-playbook.md` — the commercial rules and copy an operator (or ChatGPT, via the clipboard workflow) uses in a live WhatsApp conversation. It is the source of truth for prices, policies, and objection handling.
- `docs/head-of-sales.md` — how the CRM assembles a deterministic ChatGPT prompt from lead data.
- This doc — *why* some of those rules exist, and a backlog of ideas not yet built or not yet tested.

Nothing here overrides `sales-playbook.md`. An experiment that would require breaking a commercial rule (e.g. auto-discounting) means the rule needs to change first — not get silently bypassed in one reply.

## How to use this

- Change one variable at a time. Casa Gaviota is one house — signal is slow, so don't stack experiments.
- Casa Gaviota has low volume; expect to need on the order of 30-50 bookings before a metric is trustworthy, not 5.
- Log every experiment in the table at the bottom: what changed, the metric, the result. An experiment with no logged metric didn't happen.
- Most of the metrics below aren't tracked anywhere yet (see each section's "Status"). Adding the tracking is often the real first step, before any copy or UI change.

## Concepts

### 1. Choice architecture — package the offer, don't itemize it

Research: choice overload reduces both conversion and satisfaction; a smaller set of well-designed defaults converts better than an assembly of independent decisions.

Casa Gaviota: the underlying data already models a bundle — `menuData.foodPackage` in `src/data/menu.ts` has a name ("Food Package"), a price, an `includes` list, and sample breakfast/lunch content, and `sales-playbook.md` already instructs "bundle the Barú transfer into a package instead of presenting every item as a surcharge." But the actual selector guests interact with, `PricingCart.tsx`, is a flat list of checkboxes ("Build your stay") that sums to an "Extras estimate" — there's no "Stay" vs "Full Experience" tier choice anywhere in the UI.

**Status: data model supports packaging, UI doesn't use it.** First experiment candidate: replace `PricingCart.tsx`'s checkbox list with two named tiers (bundling existing food/transport line items) and compare `open-wa-popup` dispatch rate and resulting lead quality.

### 2. Menu engineering — popularity × contribution margin

Research: menu items should be evaluated on a two-axis matrix (popularity × margin), not markup percentage alone — push high-margin/high-popularity items, reposition or drop the rest.

Casa Gaviota: applies to `src/data/menu.ts` food items, the drinks list (including the `price_6pack` field, which already exists on `DrinkItem` — the "six-pack" idea in the underlying data, just not necessarily surfaced with an upsell nudge), and day-trip add-ons from `sales-playbook.md`'s Upsells section.

**Status: not started.** The CRM tracks category-level `food_amount`/`transport_amount`/`cost_food_cents`/`cost_transport_cents` (flat per-stay, per migration 0010) but no line-item sales data — there's no record of which dish or drink an actual guest chose. This matrix can't be built until line-item choices are captured somewhere (even a free-text note field logged consistently would be a start).

### 3. Descriptive menu labels

Research: descriptive labels (origin, preparation, sensory detail) measurably increase both sales and guests' rated attitude toward the food and the restaurant, versus a bare item name.

Casa Gaviota: `MenuItem` and `DrinkItem` already have optional `description_en`/`description_es` fields, and most items (28 of 37 at last check) already have one filled in. This is closer to done than assumed — the next step is an audit for which items are still missing a description and whether the existing ones lean into the Caribbean/Barú/fresh/local identity `sales-playbook.md` describes, not a rewrite from scratch. Any new copy must stay true to what's actually served — overpromising here raises expectations faster than the in-person experience can meet them.

**Status: mostly built, quality/coverage audit not done.**

### 4. Sell relaxation, not food

Research: framing a purchase around the problem it removes (a whole day of not having to plan/shop/cook/clean) tends to be valued more on a vacation than the literal deliverable (three plates of food).

Casa Gaviota: `sales-playbook.md` already leads with "Sell the experience before the price" for accommodation generally. This is a copy extension of the same principle specifically to food/transport framing in `WhatsAppPopup.tsx`, `WAInlineForm.tsx`, and the WhatsApp reply guidance — e.g. framing full food service as "you won't think about meals all trip" rather than listing what's served.

**Status: not started; copy-only change, low effort.**

### 5. Pre-arrival sequencing (transport → food → drinks → special requests)

Research: once a guest has committed money, the sales question changes from "will you spend with us" to "how do you want this to work" — a good moment for a second, lower-friction commercial touch after the deposit, rather than trying to sell everything in the first quote.

Casa Gaviota: the unified pipeline (`UNIFIED_STATUSES` in `src/lib/crm.ts`) already has `upsell_pending`/`upsell_confirmed` stages — but they only exist on `AIRBNB_PIPELINE`, because an Airbnb booking arrives with accommodation already paid and food/transport genuinely are a distinct later sale. `DIRECT_PIPELINE` (direct/booking.com bookings — the majority) has no equivalent stage: food and transport are decided during `quoted`/`deposit_requested`/`deposit_paid`, in the same conversation as accommodation.

**Status: structurally exists for Airbnb only.** Whether staging direct bookings the same way (defer the food/transport ask to just after `deposit_paid`, rather than bundling into the first quote) increases attach rate is untested and would need a `DIRECT_PIPELINE` change (a real schema/pipeline decision, not just copy) plus a way to measure attach rate before/after.

### 6. Fast, visible service recovery

Research: guest satisfaction after a service failure depends heavily on speed — one study found much higher satisfaction recovering within 30 minutes versus 2 hours — and on involving the guest in the fix. Thanking a guest for reporting a problem (rather than treating the complaint itself as the bad part) also measurably improves recovery satisfaction and return intent.

Casa Gaviota: this is an operational/WhatsApp-script matter for Manuel, not code. Suggested script, to live in `sales-playbook.md` alongside the existing Objection handling section:

> *"Gracias por avisarme. Ya estoy resolviéndolo. En 20 minutos te cuento cómo vamos."* — acknowledge → thank for reporting → fix immediately → communicate progress → compensate only if warranted.

**Status: not written down anywhere yet.** Candidate: add a short "Service recovery" section to `sales-playbook.md`.

### 7. Compensation isn't automatically a discount

Research: guests weigh outcome, process, and interpersonal fairness separately; immediate correction of the problem outranks apology, replacement, or discount as a recovery lever in hospitality-specific studies.

Casa Gaviota: `sales-playbook.md` already says "Never offer a discount automatically" — but that line currently sits under sales/objection handling (pricing pushback pre-booking), not under in-stay problem recovery. Worth stating explicitly for both cases: the same "rapid fix + genuine attention (a bottle of wine, dessert, drinks) + follow-up" approach applies to an in-stay issue as it does to a price objection.

**Status: principle exists, needs to be extended explicitly to in-stay recovery.**

### 8. Anchoring and decoys

A visibly higher-priced or larger option (e.g. the existing "Premium (with lobster)" food-package tier already in `menuData.foodPackage`) makes the standard option look reasonable by comparison, when shown alongside it rather than only on request.

**Status: the anchor already exists in data; untested whether presenting it changes standard-tier take-rate.**

### 9. Partitioned pricing

Showing "accommodation (quoted separately) + $50/day food + $250/$200 transport" as clearly separated, named components (already the site's approach per `CLAUDE.md`'s pricing model) can read as more transparent and trustworthy than a single blended number, at the cost of more numbers on the page. Casa Gaviota already does this by policy (accommodation is never blended into a total); no change needed, just worth naming as a deliberate choice rather than an accident of the bespoke-pricing constraint.

### 10. Scarcity and social proof

Real, non-fabricated scarcity ("only date X available that week") or proof (reviews, repeat-guest mentions) can lift conversion, but must never be fabricated — `sales-playbook.md`'s "never invent or infer availability" rule already forecloses fake scarcity. Any use here must be genuinely grounded in HostHub/D1 state, e.g. surfacing a real close-in-time competing lead (already computed for the Head of Sales prompt, per `docs/head-of-sales.md`) directly to the guest when true.

### 11. Peak-end rule

Guests judge an experience largely by its peak moment and its ending, not the average. For Casa Gaviota this argues for deliberately designing the last few hours (checkout, a departure gesture) rather than only the arrival — currently undocumented as an operational step anywhere.

**Status: not started, operational not code.**

### 12. Defaults

Whatever is pre-selected or offered first is disproportionately likely to be chosen. Relevant to whichever package/tier ends up as the default framing once #1 is built, and to which food/transport option is offered first in a WhatsApp reply.

### 13. Pre-arrival merchandising

A second, low-friction commercial touch (drinks, special requests) 3-5 days before arrival, distinct from #5's pipeline staging — this could be as simple as a manual WhatsApp template sent by Manuel at a fixed lead time before check-in, logged as an interaction. `UnifiedRecordDetail.astro` already logs interactions; a "pre-arrival touch sent" interaction type would make this measurable.

**Status: not started.**

### 14. Review generation

Timing and phrasing of a review ask matters — asking near the peak-end moment (#11) rather than generically after checkout tends to produce more and better reviews. No review-request flow exists in the codebase today.

**Status: not started.**

## Experiment log

Record every experiment here, in order, one row per change. "Metric" must be something actually measurable today — if it isn't, the real first task is adding the tracking, not running the experiment.

| Date started | Change | Concept(s) | Metric | Where measured | Result |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
