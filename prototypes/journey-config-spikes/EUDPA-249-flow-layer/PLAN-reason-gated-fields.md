# Plan — reason-gated Destination country / Port of exit / Exit date

Adds three obligations under Reason for import, each conditional on
`reasonForImport` via `equalsGate` / `includesGate`. Closes the gap
flagged in the MODEL.md vs V4 spec comparison
(Confluence page 6497338582, "Reason of Import" section).

Locked open decisions from the planning conversation:

- **One page per obligation** under the existing `reason` subsection
  (mirrors `purpose-details` — consistent with how the spike already
  handles reason-gated fields).
- Storage / evaluator shape unchanged — the three new obligations are
  ordinary scalar notification-level fields, purge-on-flip like
  `purposeInInternalMarket`.

## Spec → obligation mapping

| Spec                | Trigger                                               | Model shape                                                                                               |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Destination country | Reason = _Transit_ OR _Transhipment or onward travel_ | `includesGate(reasonForImport, ['transit', 'transhipment-or-onward-travel'], mandatory, {inScope:false})` |
| Port of exit        | Reason = _Transit_ OR _Temporary admission horses_    | `includesGate(reasonForImport, ['transit', 'temporary-admission-horses'], mandatory, {inScope:false})`    |
| Exit date           | Reason = _Temporary admission horses_                 | `equalsGate(reasonForImport, 'temporary-admission-horses', mandatory, {inScope:false})`                   |

Reason values are already declared in `REASON_FOR_IMPORT_OPTIONS`
(`domain/index.js:334`).

## File-by-file changes

### 1. `obligations/obligations.js`

- Add three reason constants near the existing block (top-of-file):
  - `destinationCountryReason` — `becauseTransitOrTranshipment`
  - `portOfExitReason` — `becauseTransitOrTemporaryAdmissionHorses`
  - `exitDateReason` — `becauseTemporaryAdmissionHorses`
- Declare three obligations directly after `purposeInInternalMarket`
  (~ line 253), using the "purge-on-flip" pattern
  (`{inScope: false}` on the else-branch).
- Add the three exports to the `obligations` manifest array (~ line 867).

### 2. `domain/index.js`

- `destinationCountryDomain` — `staticEnum` on the same country list
  `countryOfOriginDomain` uses (`EEA_EFTA_COUNTRY_OPTIONS`, ~ line 597).
  V4 spec says "Country selected from the destination country list" —
  reuse the same MDM list for the spike.
- `portOfExitDomain` — `staticEnum` on `PORT_OF_ENTRY_OPTIONS` (~ line
  443). Spec: "Port selected from the port of entry list (Exit and
  Entry share the same list)".
- `exitDateDomain` — clone of `arrivalDateAtPortDomain` (~ line 1055):
  DD/MM/YYYY calendar-valid predicate. No range constraint for the spike.
- Register all three in the `[[obligation.id, domain]]` array (~ line 1151).

### 3. `locales/en.json`

- Under `fields.*`: `destinationCountry`, `portOfExit`, `exitDate` —
  each with `pageTitle`, `legend`, optional `hint`. Match the tone
  of `purposeInInternalMarket` (~ line 84).
- Under `errors.*`: `destinationCountry.required`, `portOfExit.required`,
  `exitDate.required` (mirror `purposeInInternalMarket.required`).

### 4. `flow/flow.js`

Add three pages under the existing `reason` subsection (~ line 133),
immediately after `purpose-details`:

```js
{
  page: 'destination-country',
  presents: [{
    obligation: destinationCountry,
    mandatoryToProceed: true,
    errors: { required: 'errors.destinationCountry.required' }
  }]
},
{ page: 'port-of-exit', presents: [/* portOfExit + mandatoryToProceed */] },
{ page: 'exit-date',   presents: [/* exitDate  + mandatoryToProceed */] }
```

Scope drives NA rendering — no flow-side branching (same pattern
`purpose-details` uses today; see `flow/flow.js:143-146`).

### 5. Tests

- `domain/index.test.js` — three `expect(domain.get(x.id)).toBe(...)`
  assertions + one options-shape smoke test per obligation.
- `obligations/evaluator.test.js` — one describe block per obligation:
  - in-scope + mandatory when eligible reason
  - out-of-scope when other reason
  - purge-on-flip (stored value dropped when reason changes)
- `flow/flow.js` covered by the walk tests below.
- `routes.test.js` / `e2e-walk.test.js` — walk each of the five reason
  values and assert page visibility:
  - `internal-market` → purpose-details visible; three new pages NA
  - `transhipment-or-onward-travel` → destination-country visible;
    port-of-exit + exit-date NA
  - `transit` → destination-country + port-of-exit visible; exit-date NA
  - `re-entry` → all three NA
  - `temporary-admission-horses` → port-of-exit + exit-date visible;
    destination-country NA
- `sketches.test.js` / `dump.test.js` may need snapshot updates.

### 6. Fixtures

- `fixtures/transit-with-lines.json` — set `destinationCountry` and
  `portOfExit` so the fixture stays submittable.
- Optional: add `fixtures/temporary-admission-horses.json` for the
  third code path.

### 7. Regeneration + docs

- `npm run docs:model` — regenerates `MODEL.md`. Confirm three new
  rows in the data dictionary and three new gate edges from
  `reasonForImport`.
- Tick this item off in `EUDPA-288-HANDOVER.md` (Known follow-ups / TODOs).
- Run `sonar analyze --staged` before commit; fix any BLOCKER/CRITICAL.

## Commit shape

Single commit:
`feat(EUDPA-288): reason-gated destinationCountry / portOfExit / exitDate`

## Out of scope

- Field-length limits on `destinationCountry` / `portOfExit` beyond
  what the enum admits — the spec calls out enum values, so the
  domain handles it.
- Regenerating any Confluence pages.
- Downstream Java backend contract — the spike is frontend-only.
