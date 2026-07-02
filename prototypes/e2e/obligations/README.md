# Obligations edge specs

Live Playwright specs for the obligations standalone spike
(`prototypes/standalone/obligations-standalone-spike/`) covering the
browser-visible behaviour the three shared specs leave unobserved. Each
spec asserts exactly one of the human parity rulings recorded 2026-07-02
in the spike `PLAN.md` §Rulings — the losing outcome of each formerly
dual-outcome question is dead and deliberately not written (no
`test.fixme` placeholders for ruled questions).

Discovered by the standard config (`testDir: prototypes/e2e`,
`testMatch: **/*.spec.js`) and run with `npm run test:prototype`.

## Spec → ruling mapping

| Spec                          | Ruling                                                 | Asserts                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `post-submit-freeze.spec.js`  | Item 1 — POST-SUBMIT FREEZE (Outcome A)                | After 'Quote confirmed': hub, task pages, `?change=1` URLs and the claims list all resolve to a read-only CYA (no Change links, no send form); a replayed POST alters nothing; confirmation re-renders the same deterministic `CI-XXXXXX` reference. Spike-a's unfrozen post-submit behaviour is intentionally NOT copied. |
| `early-cya-access.spec.js`    | Item 2 — EARLY CYA (Outcome A, open access)            | Direct-URL CYA mid-journey renders soft "you still need to…" prompts, never a redirect; direct-URL quote-summary prices a half-empty journey; the hard gate is the CYA POST only — including the stale-recheck branch, a 200 CYA re-render naming 'Add at least one claim'.                                                |
| `mandate-composition.spec.js` | Item 3 — MANDATES (Outcome B, fullName-only page-hard) | Only fullName blocks a page save (GDS structure); blank email/vehicle saves advance with the hub showing In progress; engine-mandatory gaps block at CYA POST with soft prompts naming them; hub-complete-with-zero-claims still blocks submit with 'Add at least one claim'; no `required` attribute renders anywhere.    |

Support file: `obligations-journey.js` — resolves the one JOURNEYS entry
these specs drive (`obligations-standalone-spike`, loud throw if
unregistered) plus `pagePath`, `journeyIdFrom` (the cookie-carried
journeyId, for pinning the deterministic reference), `reachHub`,
`submitToQuoteConfirmed` and `expectGdsFieldError`.

## Discipline

- These specs run ONLY against the obligations journey, scoped through
  the helper — never a loop over the whole `JOURNEYS` array. The three
  shared specs never depend on this folder, and nothing here gates the
  other spikes.
- Guard-landing order (spike `PLAN.md` §b Step 11.6): the spike's
  `routes/guard.js` is wired via `withGuard` only AFTER the three shared
  specs are green for the new journey. `post-submit-freeze.spec.js`
  requires that wiring — it asserts the freeze branch the guard carries.
- Assertions pin GDS structure over copy where the shared specs do
  (error summary + `#field-error` + `a[href="#field"]`), and use
  `getByLabel` on the cover page (the single-'Yes' conditional-reveal
  accessible-name trap).

## Rejected candidates (lessons)

- **Dual-outcome `test.fixme` pairs** — earlier drafts kept both
  outcomes of each open parity question as skipped describes. Rejected:
  once a ruling lands, the dead outcome is deleted, not parked; a
  permanently-skipped spec rots and misleads coverage counts.
- **Looping these specs over `JOURNEYS`** — rejected: the rulings are
  obligations-paradigm decisions (spike-a is deliberately divergent
  post-submit), so running them journey-wide would fail spikes whose
  behaviour is correct for their own paradigm.
- **Asserting exact prompt copy lists at CYA** — rejected: the prompt
  set varies with how much of the journey is answered; specs assert the
  banner plus named representative gaps instead.
