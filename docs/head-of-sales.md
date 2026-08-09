# Head of Sales clipboard workflow

The Head of Sales feature helps the Casa Gaviota owner prepare a better WhatsApp response without connecting the CRM to an AI API.

## Operator workflow

1. Open a lead in `/admin`.
2. Confirm that dates, guest counts, notes, pricing, and payment information are current.
3. In **Head of Sales**, choose **Preview prompt** when you want to inspect the context.
4. Choose **Copy for ChatGPT**.
5. Paste the prompt into the existing Casa Gaviota ChatGPT conversation.
6. Review and adapt the proposed reply before sending it manually through WhatsApp.

Copying does not change lead status, log a follow-up, open WhatsApp, or send anything.

## Context included

The prompt is assembled during server rendering from a deliberately small set of fields:

- Lead name, language, source, dates, guest counts, intent, and CRM stage.
- Captured inquiry text and relevant Notes content.
- D1 booking conflicts and competing lead interest for the requested dates.
- Recorded accommodation, food, transport, and quote amounts.
- Informational PriceLabs pricing when available.
- Calculated full-food-service and transport options.
- Recorded payment balance and linked reservation status.
- A list of important missing fields.

The prompt omits phone numbers, record IDs, raw database payloads, environment variables, payment links, and unrelated implementation metadata.

## Truth and safety boundaries

- HostHub remains the source of truth for reservations and final availability. A clear D1 conflict check means no active CRM conflict was found; it is not an unconditional availability guarantee.
- PriceLabs is informational. It is labeled separately from an operator-recorded quote.
- Calculated food and transport options are labeled as calculations or rates, not confirmations.
- Payment and reservation states come from D1 and are never inferred from conversation text.
- Unknown values are written as `unknown` so ChatGPT can ask for confirmation instead of guessing.
- There is no OpenAI API call, API key, background generation, or automated WhatsApp sending.

## Calculation rules

Calculation functions live in `src/lib/sales-calculations.ts` and are covered by tests.

- Full food service: guests × service days × COP 150,000.
- A stay uses its number of nights as food-service days. A day trip uses one service day.
- Barú village boat: COP 300,000 round trip per group.
- Cartagena direct boat: COP 700,000 per leg per group.
- Package totals add only explicit deterministic components.

Commercial rules and customer-facing sales guidance are maintained in `docs/sales-playbook.md`. If a rate changes, update both the playbook and the calculation constant, then run `npm test`.

## Implementation map

- `src/lib/sales-suggestion.ts` selects and formats lead context and builds the clipboard prompt.
- `src/lib/sales-calculations.ts` owns commercial calculations and rate constants.
- `src/components/admin/UnifiedRecordDetail.astro` loads the deterministic data and renders Copy/Preview controls.
- `tests/sales-suggestion.test.ts` covers prompt content, unknown values, state grounding, secret exclusion, and the no-network boundary.
- `tests/sales-calculations.test.ts` covers food, transport, and package arithmetic.

## Manual verification

Use a lead with complete data and another with missing dates:

1. Preview both prompts and confirm the displayed facts match the CRM.
2. Confirm incomplete fields say `unknown`.
3. Confirm saved quotes are distinct from PriceLabs suggestions.
4. Confirm the prompt contains no phone number, payment link, key, or internal ID.
5. Copy the prompt and paste it into ChatGPT.
6. Confirm no request appears for an AI-generation endpoint in browser developer tools.

