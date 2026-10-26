# Live-animals services

## Commodities

The commodities reference service belongs to the live-animals set:

- [`src/server/app/sets/live-animals/services/commodities/index.js`](../services/commodities/index.js)
- [`src/server/app/sets/live-animals/services/commodities/rules.js`](../services/commodities/rules.js)
- [`src/server/app/sets/live-animals/services/commodities/stub.js`](../services/commodities/stub.js)

It provides CN codes and the species under them, the `0102` type split and the
allow-lists used by live-animals obligations and pages. This vocabulary is not a
generic platform contract.

At boot, this set's gateway
[`src/server/app/routes-live-animals.js`](../../../routes-live-animals.js) (the
[`routes.js`](../../../routes.js) barrel only re-exports it) passes the service to
[`configureCommodityReference()`](../../../services/persistence/records/notification-mapper/commodity-reference.js)
so generic notification-mapper code does not import the set.

### The commodity rules

- `COMMODITY_IDENTIFIERS` lists each CN code's identifiers in the order the
  identification page asks for them. The order belongs to the code: `0102`
  (cattle) is asked for its ear tag first, `0101` (horses) for its microchip.
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
  `UNWEANED_CODES`: `0102` (cattle) and `0103` (swine).
- Every consignment is asked for a CPH number unless every line's code is
  exempt. `CPH_EXEMPT_CODES` names the exemptions by code: `0101` (horses and
  donkeys) and `01061900` (cats, dogs and ferrets, which are asked for each
  animal's permanent address instead). A line with no code yet is ignored, and a
  code added under any other value is asked.

### Codes and species from MDM

- MDM supplies the CN codes and the species under them, but no rules, so the
  rules live in [`rules.js`](../services/commodities/rules.js). A rule keyed by
  a Latin name matches MDM's spelling exactly: if MDM corrects a spelling, the
  rule stops matching and has to follow it.
- `PERMANENT_ADDRESS_SPECIES` gates on the code and the species together, as
  above. `01061900` holds the domestic cats, dogs and ferrets that need one
  alongside many mammals that do not, and MDM lists one species under several
  codes, so neither the code nor the species alone is enough. The genus Felis
  (MDM's "Cat") is not listed. `Canis lupus familiaris` is listed beside MDM's
  `Canis familiaris` in case MDM renames it.
- The package-count list holds the codes of the design's package-count list
  that MDM's live-animal data holds. Where the design named an entry by animal,
  the whole code is on the list.
- The Domestic/Game split on `0102` comes from the IPAFFS commodity-categories
  extract, which names `Bos spp.` as Game. MDM lists `Bos sp.`, so no `0102`
  species MDM offers is Game today. Every other code has one type with blank
  text, which the backend payload drops.
- MDM has no common name for some species, so a line's common name is
  optional.
- A notification sends its first line's CN code (for example `0102`) as
  `commodity.name`, until reference-data supplies commodity names. The backend
  passes it to PIMS as each trade line's description and common name, and
  both dashboards show it as the commodity. Each line stores MDM's common
  name, which the notification mapper does not send yet; EUDPA-669 maps it
  into the payload.
- The search page saves only a species a search showed it, so it keeps the
  rows shown since it last saved as the flow-only answer
  `commoditySearchRows`. They are never sent to the backend. The chosen species
  also ride back as hidden `selection` values, so a choice made under an earlier
  query survives a new search.
- The stub reads
  [`_capture/fixtures/commodities.json`](../../../services/_capture/fixtures/commodities.json),
  which `npm run capture:live-animals` refreshes from reference-data: every
  species the `010` search lists, grouped by code. The stub does not rank
  matches as MDM does; it lists them in data order.
- The species check at submission reads a renamed species as a removed one:
  the old name is no longer listed under its code.

## Platform services used by the journey

The journey also calls shared service barrels for countries, ports, address books,
document uploads, document types, certification purposes, transport reference data
and import-reason purposes. These remain under `src/server/app/services/` and are
documented in [Platform services](../../../docs/services.md).
