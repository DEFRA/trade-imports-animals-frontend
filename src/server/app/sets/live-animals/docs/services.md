# Live-animals services

## Commodities

The commodities reference service belongs to the live-animals set:

- [`src/server/app/sets/live-animals/services/commodities/index.js`](../services/commodities/index.js)
- [`src/server/app/sets/live-animals/services/commodities/rules.js`](../services/commodities/rules.js)
- [`src/server/app/sets/live-animals/services/commodities/stub.js`](../services/commodities/stub.js)

It provides CN codes and the species under them, and the allow-lists used by
live-animals obligations and pages. This vocabulary is not a
generic platform contract.

At boot, this set's gateway
[`src/server/app/routes-live-animals.js`](../../../routes-live-animals.js) (the
[`routes.js`](../../../routes.js) barrel only re-exports it) passes the service to
[`configureCommodityReference()`](../../../services/persistence/records/notification-mapper/commodity-reference.js)
so generic notification-mapper code does not import the set.

### The commodity rules

- `COMMODITY_IDENTIFIERS` lists each CN code's identifiers in the order the
  identification page asks for them. The order belongs to the code: `0102`
  (cattle) is asked for its ear tag first, `0101` (equines: horses, asses,
  mules and hinnies) for its microchip.
- The per-identifier allow-lists are derived from that map, so an identifier's
  gate and its place on the page cannot drift apart. Adding an identifier to a
  code is one edit. `IDENTIFIED_CODES` is derived from the same map, so whether
  a code is asked to identify at all is part of that edit.
- A code with no identifiers, such as poultry (`01051111`), is asked for none.
  There is no free-text identifier, so its line gets no identification card and
  no animal records.
- Animal identifiers are optional unless more than one commodity line carries a
  code with identifiers. Then each such line needs at least one complete
  identifier record, never one per animal. `moreThanOne` on the unit-record
  group's `requires.floorAppliesToParent` carries this rule.
- The permanent address is asked only of a `01061900` line whose species is in
  `PERMANENT_ADDRESS_SPECIES`, so `01061900` must be in `IDENTIFIED_CODES` or the
  address is never collected.
  [`index.test.js`](../services/commodities/index.test.js) pins this: every
  permanent-address species MDM holds sits under an identified code.
- The unweaned-animals question is asked of a line whose code is in
  `UNWEANED_CODES`: `0101` (equines), `0102` (cattle), `0103` (pigs),
  `010410` (sheep) and `010420` (goats), set by the live animals data-fields
  specification.
- Every consignment is asked for a CPH number unless every line's code is
  exempt. `CPH_EXEMPT_CODES` names the exemptions by code: `0101` (equines)
  and `01061900` (cats, dogs and ferrets, which are asked for each
  animal's permanent address instead). A line with no code yet is ignored, and a
  code added under any other value is asked.

### Codes and species from MDM

- MDM supplies the CN codes and the species under them, but no rules, so the
  rules live in [`rules.js`](../services/commodities/rules.js). A rule keyed by
  a Latin name matches MDM's spelling exactly: if MDM corrects a spelling, the
  rule stops matching until it is confirmed against MDM and corrected to
  follow it. Whether the domestic dog's entry below still needs that
  correction is an open question, not resolved here.
- `PERMANENT_ADDRESS_SPECIES` gates on the code and the species together, as
  above. `01061900` holds the domestic cats, dogs and ferrets that need one
  alongside many mammals that do not, and MDM lists one species under several
  codes, so neither the code nor the species alone is enough. The genus Felis
  (MDM's "Cat") is not listed. The rule lists `Felis catus`, `Canis familiaris`
  and `Mustela putorius furo`; the captured MDM data the stub serves reaches
  the gate with `Felis catus` and `Mustela putorius furo` only — it holds no
  `Canis familiaris` spelling. `Canis lupus familiaris` is not listed either —
  MDM does not hold that spelling.
- The package-count list is the live animals data-fields specification's
  number-of-packages commodities that MDM's live-animal data holds. Where the
  specification named an entry by animal, the whole code is on the list. It
  leaves out three codes MDM serves: rabbits other than domestic (`01061490`),
  because the specification lists only the domestic rabbit entries, which both
  sit under `01061410`; and ratites (`01063300`) and pigeons (`01063910`),
  because the specification names birds of prey, psittaciformes and other game
  birds but not those two.
- MDM has no common name for some species, so a line's common name is
  optional.
- Save sends a `commodities[]` entry per grouped commodity line with `name`,
  `commodityCode`, MDM `description` where the stub holds one, and each species
  carries MDM's `commonName`. GBN-AG reads `description` on the entry and
  `commonName` on each species. The dashboard list label joins entry names from
  `commodities[]`, or falls back to the single legacy `commodity` field until
  reference-data supplies names for every CN code.
- The search page saves only a species a search showed it, so it keeps the
  rows shown since it last saved as the flow-only answer
  `commoditySearchRows`. They are never sent to the backend. The chosen species
  also ride back as hidden `selection` values, so a choice made under an earlier
  query survives a new search. The page lists the results it received in
  commodity-heading then species-label order, and the selected panel offers a
  removal per chosen species.
- The stub reads
  [`_capture/fixtures/commodities.json`](../../../services/_capture/fixtures/commodities.json):
  every species the stub's own saved `010` search lists, grouped by code.
  `npm run capture:live-animals` cannot refresh this one fixture by itself:
  reference-data answers at most a hundred species for one search and the
  stub answers only the first page it is asked for, so a run of the script
  against the stack collects only the first hundred species and would delete
  the rest of the file. Until reference-data or the stub can answer a whole
  species list in one request, the fixture is derived by hand from the stub's
  saved MDM response rather than captured through the running stack. The stub
  does not rank matches as MDM does; it lists them in data order. The species
  labels this fixture carries are pinned on two sides, by two independent
  suites, and neither compares the fixture against the other: in this repo,
  [`fixtures.test.js`](../../../services/_capture/fixtures.test.js) compares
  the fixture against the codes, Latin names and common names it lists, and
  nothing outside this repo; in the tests repo, the stack test
  `trade-imports-ins-tests` `tests/animals/e2e/pages/commodities.spec.ts`
  asserts the species checkbox accessible names and the selected panel
  against `speciesLabel(commodityLines.cattle)` (`commodities.spec.ts:69`
  and `:109`), so it fails if the MDM stub's common name changes.
  Whoever recaptures the stub must update this fixture by hand to match,
  because no automated check compares the two files.
- The species check at submission reads a renamed species as a removed one:
  the old name is no longer listed under its code.

## Platform services used by the journey

The journey also calls shared service barrels for countries, ports, address books,
document uploads, document types, certification purposes, transport reference data
and import-reason purposes. These remain under `src/server/app/services/` and are
documented in [Platform services](../../../docs/services.md).
