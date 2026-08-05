# Live-animals services

## Commodities

The commodities reference service belongs to the live-animals set:

- [`src/server/app/sets/live-animals/services/commodities/index.js`](../services/commodities/index.js)
- [`src/server/app/sets/live-animals/services/commodities/stub.js`](../services/commodities/stub.js)

It provides commodity and species options, the Cow Domestic/Game type mapping and
the allow-lists used by live-animals obligations and pages. This vocabulary is not a
generic platform contract.

At boot, [`src/server/app/routes.js`](../../../routes.js) passes the service to
[`configureCommodityReference()`](../../../services/persistence/records/notification-mapper/commodity-reference.js)
so generic notification-mapper code does not import the set.

## Platform services used by the journey

The journey also calls shared service barrels for countries, ports, address books,
document uploads, document types, certification purposes, transport reference data
and import-reason purposes. These remain under `src/server/app/services/` and are
documented in [Platform services](../../../docs/services.md).
