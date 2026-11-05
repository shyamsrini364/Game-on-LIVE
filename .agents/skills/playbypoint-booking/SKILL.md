# Public demo boundary

This is a safe reference skill, not an enabled runtime integration. The public demo never instantiates PlaybypointSkill or opens provider pages automatically. Internal development evidence is deliberately not bundled. Historical observations below are not demo inventory.

---
name: playbypoint-booking
description: Use for Game On! Playbypoint browser integration, real court/pricing observations, supervised checkout investigation, handoff validation and Ernie's LangGraph tools for Pickleholic or Level Up. Not for unrelated UI/auth/deployment tasks.
---

# Game On! — Playbypoint booking skill (Codex harness)

This skill guides the **coding agent**. The actual **Ernie runtime tools** are implemented in `gameon/erne/`; adding or editing this SKILL.md does not enable new runtime capabilities.

## Source of truth — always establish latest state

1. Read `README.md` and `docs/DEMO_ARCHITECTURE.md` **before using any checkpoint statement below**. Inspect implementation and supporting evidence, not just handoff claims. Follow the currently active branch and existing approval limits.
2. Read `docs/PLAYBYPOINT_LIVE_READS.md` first for the I-058 live implementation, then `docs/PLAYBYPOINT_BROWSER_SKILL.md` for historical I-056 fixture architecture, and `docs/assets/i057-visible-playwright/REPORT.md` for the historical I-057 browser diagnostic. Earlier statements about universal HTTP 403 or a wholly fixture-only adapter are **superseded** by I-057/I-058.
3. Inspect relevant source: `gameon/erne/playbypoint.py`, `gameon/erne/playbypoint_live.py`, `gameon/erne/playbypoint_service.py`, `gameon/erne/playbypoint_contracts.py`, `gameon/erne/playbypoint_policy.py`, `gameon/erne/graph.py`, and associated tests.
4. Check the local working tree before changes; preserve unrelated uncommitted work.

## Verified baseline at I-058 (5 November 2026)

- **Real live browser:** Visible local Windows Playwright Chromium successfully loaded **both** Playbypoint venues, including the embedded Playbypoint iframe, and selected date/time/Court 3; previous 403 was not universal.
- **Real pricing:** After three **separately owner-approved** Next clicks, Playwright displayed:
  - Pickleholic Main Courts, 7 Nov 2026, 18:30–19:30, Court 3, one payer: $50 + $1.25 technology fee = $51.25. For four provider players: four $12.50 shares, $1.24 technology fee, displayed total $51.24. Explicit currency code and separate tax were not observed in that summary. The differing fee is observed; don't derive a formula.
  - Level Up, 8 Nov 2026, 18:30–19:30, Court 3, provider player setting 1: AUD$45.45 + AUD$4.55 tax = AUD$50.00. Provider player count does not establish group capacity.
  - These are **historical quoted displays**, not live availability guarantees, holds or bookings.
- **Real tool integration:** `PlaybypointSkill.get_court_options(..., live_page=page)` can read an **already-open, separately approved** real checkout summary. `LocalPlaybypointSession.get_court_options(..., live_page=page, slot_id=...)` enforces organiser/game restrictions. The bounded existing LangGraph consumed actual fresh observations with **synthetic game groups**, reporting `simulated=false`, `llm_used=false`. It did not itself navigate provider selection/Next.
- **Fixture path:** Offline request interception, fixture tests and fixture-only `prepare_checkout` remain; a live quote **cannot** authorise fixture checkout. The live reader does **not** autonomously select courts, click Next, submit personal details or reach final payment.
- **Checkout transfer:** The two observed `#/booking/checkout` URLs **lost court/time selections in fresh browser sessions**. They are **not verified portable prefilled checkout links**. Final payment URL and user-controlled handoff remain unverified. Do not promise them.
- **Unknown:** Whether Next creates/renews a temporary hold, its expiry, unattended Next permission, confirmation/payment, hosted browser execution, production UI integration, and real authenticated-group acceptance. **The three owner-approved Next clicks from I-058 are consumed, not standing permission.**

If a newer checkpoint provides additional evidence, prefer it and update this baseline rather than repeating completed experiments.

## Product rule — default provider player selector to 1 (owner decision, 5 November 2026)

- **Always select 1 in Playbypoint's `Number of players` / provider player-count control by default** when inspecting a court, recording a standard court price, or preparing the user handoff at Pickleholic or Level Up. Do **not** automatically copy Game On!'s group size into this control. If the provider rejects 1 or an explicitly authorised booking scenario requires another count, stop and flag the exception rather than silently change it.
- **Court pricing is modelled per court and duration, not multiplied by the number of Game On! participants.** Game On!'s actual participating-player count is still used for schedule eligibility and group coordination; keep it separately from `provider_players=1` and the amount the booker must pay. **In the UI, divide the verified/cached whole-court total by the number of participating players to display an indicative per-person share where helpful** (e.g., recommendation card and booking breakdown). Label the per-person amount as a calculated split, not a price independently quoted by Playbypoint, and show the full court total prominently. Handle rounding so displayed shares reconcile to the total when needed; don't present the split as separate charges or automatic split payment. If group count is zero or the total is unknown, omit the calculation.
- **Do not assert prices and fees are invariant across provider player-count settings.** I-058 observed Pickleholic's one-player total $51.25 and four-player total $51.24, due to a technology-fee difference. For Game On!'s default pricing reference, use only a verified one-player observation for the relevant court/time/duration and label its freshness; recheck the final provider total before payment. Never reuse a four-player quote as though it were the one-player quote.
- Treat the setting as the **provider booking/payer selector**, not a declaration that only one human will play or that the venue's physical court capacity is one. If Playbypoint uses that field to specify actual attendance or booking eligibility, verify the venue rules and don't misrepresent attendance to the provider. Require user review when interpretation affects a real reservation.
- For future application-code changes, update adapter defaults, live-reader validation, fixture expectations and UI copy **consistently** with this rule; updating this SKILL.md alone does not alter runtime behaviour. Do not modify runtime logic unless the user separately requests implementation.

## Workflow for the next task

1. **Identify the exact missing milestone.** Do not redo completed I-058 live price reads or report the entire adapter as fixture-only. Current priority is understanding hold/Next semantics and a truthful handoff, then (with suitable approval) implementing bounded live selection-to-summary and UI integration.
2. **Reuse existing architecture.** Keep the shared two-venue adapter and existing `get_court_options` / `prepare_checkout` LangGraph tools; provider differences stay in configuration. A `get_checkout_handoff` helper, if useful, is deterministic and can only return a *verified transferable* checkout target or a clearly marked `booking_page_only` fallback. Do not hallucinate deep links.
3. **Respect live boundary.** Local owner-supervised visible Chromium (`headless=False`), normal public booking routes, fresh context; examine actual iframe and accessible controls. Observe ordinary public selection freely within task scope, but **stop before any Next action that might create a temporary hold unless its semantics are established or the user gives fresh, specific approval**. No CAPTCHA/security bypass, stealth, copied browser sessions, undocumented private endpoints, or uncontrolled repeated requests. Do not enter personal details, submit reservations or pay without separate authorisation.
4. **Keep observations grounded.** Capture provider, court/category, exact Melbourne date/time/duration, group participants versus provider payer count, displayed base/tax/fees/total, source, timestamp, freshness and unknowns. Preserve revision, eligible group slots, preferences, signed organiser approval, replay protection and no automatic owner approval.
5. **Handoff must be honest.** Confirm whether a link opened in a fresh browser preserves the exact court, duration, time and final amount. Existing I-058 tests indicate **no**. Avoid leaking cookies, session identifiers or private links to Hark/Grok; the optional “Send to Personal Assistant” UI should copy only a sanitised official booking URL plus court/time/price-as-observed and explicit revalidation/confirmation instructions.
6. **Validate precisely.** Run focused relevant tests and, only if freshly approved, supervised real website checks. Label each result `live automated`, `owner-operated`, `synthetic-group integration`, `recorded-live-text offline parser`, or `fixture-simulated`; a synthetic-group graph run is not a production authenticated-game integration.
7. **Document and hand off.** Update project context/learning journal and mandated structured handoff per `AGENTS.md`, with observed results, approval boundaries, skipped checks and remaining blockers. Do not claim booked, paid, held, prefilled checkout, or deployed when not verified.

## Key paths / diagnostics

- `docs/PLAYBYPOINT_LIVE_READS.md` — **current I-058 runbook and verification**.
- `docs/PLAYBYPOINT_BROWSER_SKILL.md` — I-056 architecture with dated historical evidence.
- `docs/assets/i057-visible-playwright/REPORT.md` — previous I-057 selection diagnostic.
- `gameon/erne/playbypoint.py` — shared tool, fixture + supervised live reader entry.
- `gameon/erne/playbypoint_live.py` — real provider summary parser.
- `gameon/erne/playbypoint_service.py` — organiser-scoped service and approval checks.
- `gameon/erne/playbypoint_policy.py` / `gameon/erne/playbypoint_contracts.py` — LangGraph action bounds and typed output.
- `tests/test_playbypoint_live.py` — live-summary parser tests against recorded/mocked content (not live provider calls).
- `.venv/Scripts/python.exe -m unittest discover -s tests -p 'test_playbypoint*.py'` — focused regression suite.
- `scripts/playbypoint_demo.py` — **fixture-only** demonstration.

Do not create branches, deploy, spend on models/services, perform holds, book or pay without the approvals relevant to those actions.

## Completion checklist

- [ ] Latest handoff and current code reconciled; no stale I-056 assumptions.
- [ ] Correct distinction between already-verified live pricing and unverified checkout.
- [ ] Browser actions respect fresh consent and potentially holding Next boundary.
- [ ] Claims distinguish live, historic, synthetic and fixture evidence.
- [ ] Checkout link is marked `booking_page_only` unless portability is actually proven.
- [ ] Tests, documentation and structured handoff reflect only work actually performed.
