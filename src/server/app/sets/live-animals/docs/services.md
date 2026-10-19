# Live-animals services

## Commodities

The commodities reference service belongs to the live-animals set:

- [`src/server/app/sets/live-animals/services/commodities/index.js`](../services/commodities/index.js)
- [`src/server/app/sets/live-animals/services/commodities/stub.js`](../services/commodities/stub.js)

It provides commodity and species options, the Cow Domestic/Game type mapping and
the allow-lists used by live-animals obligations and pages. This vocabulary is not a
generic platform contract.

At boot, this set's gateway
[`src/server/app/routes-live-animals.js`](../../../routes-live-animals.js) (the
[`routes.js`](../../../routes.js) barrel only re-exports it) passes the service to
[`configureCommodityReference()`](../../../services/persistence/records/notification-mapper/commodity-reference.js)
so generic notification-mapper code does not import the set.

### The commodity rules

- `COMMODITY_IDENTIFIERS` lists each commodity's identifiers in the order the
  identification page asks for them. The order belongs to the commodity: a cow
  is asked for its ear tag first, a horse for its microchip.
- The per-identifier allow-lists are derived from that map, so an identifier's
  gate and its place on the page cannot drift apart. Adding an identifier to a
  commodity is one edit.
- A commodity with no identifiers, such as fish, is asked for none. There is no
  free-text identifier, so its line gets no identification panel and no animal
  records.
- Animal identifiers are optional unless more than one commodity line carries
  an identified commodity. Then each such line needs at least one complete
  identifier record, never one per animal. `moreThanOne` on the unit-record
  group's `requires.floorAppliesToParent` carries this rule.
- Every commodity in `PERMANENT_ADDRESS_COMMODITIES` must also be in
  `IDENTIFIED_COMMODITIES`, or the address is never collected.
  [`index.test.js`](../services/commodities/index.test.js) pins this.
- The unweaned-animals question is asked only of a commodity with unweaned
  options. Of the commodities offered, only cattle has them.
- Every consignment is asked for a CPH number unless its commodity code is
  exempt. `CPH_EXEMPT_COMMODITY_CODES` names the exemptions by code, not picker
  name: `0101` (horses and donkeys) and `01061900` (cats, dogs and ferrets,
  which are asked for each animal's permanent address instead). A commodity
  added under any other code is asked.

## Platform services used by the journey

The journey also calls shared service barrels for countries, ports, address books,
document uploads, document types, certification purposes, transport reference data
and import-reason purposes. These remain under `src/server/app/services/` and are
documented in [Platform services](../../../docs/services.md).
