# Services

The service layer is the seam between the journey and its backing systems:
reference-data (MDM) option lists, saved addresses, and document uploads. Each
backing system gets one folder under `services/<name>/`, and the controllers
depend only on that folder's interface. The model carries no display copy and no
value lists; every enum the journey offers comes from a service here.

## Folder-per-service

Each service is a folder with a fixed shape:

- `services/<name>/index.js` — the interface the controllers call. It is
  synchronous and holds no data of its own; it reads from a data module and
  shapes the result into option lists and label lookups.
- `services/<name>/stub.js` — the vendored reference data: the code→label maps
  and option arrays that stand in for the real backing system.
- `services/<name>/client.js` or `real.js` — present only where a real backend
  exists (`countries`, `ports`, `document-uploads`, and the persistence
  services). It fetches or calls the live system.

Controllers import `services/<name>/index.js` and nothing deeper, so the data
source can change behind the interface without touching a page.

## Run mode

One environment variable, `LIVE_ANIMALS_MODE` (`stub` | `real`, default `stub`),
decides what backs the seam. It is read in `services/mode.js`, which exports
`mode()` and `isRealMode()`. Two wiring patterns sit behind that switch.

**Prime-at-boot** — `countries` and `ports`. The `index.js` holds mutable module
state seeded from `stub.js`, and exposes an async `prime()`. In real mode
`prime()` fetches from reference-data (`client.js`) and replaces the seed; in
stub mode it returns immediately. `routes.js` `register` awaits each `prime()`
at boot, so the interface stays synchronous for every consumer and a failed
fetch fails boot loudly. Stub mode never calls the network.

**Module switch at import** — `document-uploads`, `persistence/records` and
`persistence/session`. Their `index.js` picks the whole implementation module —
`real.js` or `stub.js` — by `isRealMode()` at import time, and re-exports it.

Services with no real backend serve their vendored data in both modes.

## Value storage and labels

Storage shape is not uniform across the enums. Most code→label enums
(`countries`, `certification-purposes`, `import-reason-purpose`) store the code
and look the label up at check-answers time. The `transport-reference` enums are
different: `meansOfTransport` and `transporterType` are stored as their display
label, so their check-answers rows render the stored value directly with no
lookup.

## The services

| Service                  | Backing system                                                                             | Interface (`index.js`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Consumers                                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `countries`              | MDM countries (EU/EEA/EFTA reference list, MDM group GBNAG_SPS_EX)                         | `originCountries()` / `originLabel(code)` for the origin and transited-country selects and their labels; `addressCountries()` (GB-inclusive name list) for address-block country selects; `prime()` fetches the live list in real mode                                                                                                                                                                                                                                                                                                                   | `features/origin/controller.js`, `features/transport/transit-countries.controller.js`, `features/transport/private-transporter-details.controller.js`, `features/commodities/animal-identification.controller.js`, `features/check-answers/controller.js` |
| `ports`                  | MDM ports of entry (BCP reference list)                                                    | `list()` (ports in reference-data order) for the port-of-entry select and its validation membership; `label(code)` for the check-answers row; `prime()` fetches the live list in real mode                                                                                                                                                                                                                                                                                                                                                               | `features/transport/port-of-entry.controller.js`, `features/check-answers/controller.js`                                                                                                                                                                  |
| `commodities`            | MDM commodities (picklist, per-commodity species, and commodity-keyed applicability lists) | `list()` and `search(query)` (matches common name, commodity code or scientific name, returning whole commodity groups); `commodityCodeFor` / `commodityNameFor`; `species()` / `speciesLabel`; `speciesFor(name)` / `isCommoditySpecies(name, value)` for the species checkboxes; and the commodity-keyed applicability lists that gate conditional fields — `packageCountCommodities`, `passportCommodities`, `tattooCommodities`, `earTagCommodities`, `horseNameCommodities`, `permanentAddressCommodities`, `unweanedCommodities`, `cphCommodities` | `features/commodities/search.controller.js`, `features/commodities/consignment-details.controller.js`, `features/commodities/animal-identification.controller.js`, `features/additional-details/controller.js`, `features/cph-number/controller.js`       |
| `certification-purposes` | MDM certification purposes                                                                 | `certificationPurposes()` / `list()` (the sixteen-value animals-certified-for code→label set) for the additional-details select and its validation membership; `certificationLabel(code)` for the check-answers row                                                                                                                                                                                                                                                                                                                                      | `features/additional-details/controller.js`, `features/check-answers/controller.js`                                                                                                                                                                       |
| `import-reason-purpose`  | MDM / policy value sets for import reason + internal-market purpose                        | `reasons()` / `reasonLabel(code)` (the reason-for-import enum) and `purposes()` / `purposeLabel(code)` (the internal-market purpose enum), both code→label, for the import-reason and import-purpose selects, their validation, and the check-answers rows                                                                                                                                                                                                                                                                                               | `features/import-reason/controller.js`, `features/import-purpose/controller.js`, `features/check-answers/controller.js`                                                                                                                                   |
| `transport-reference`    | Transport reference enums                                                                  | `meansOfTransport()` (the means-of-transport radios), `overlandMeans()` (the overland subset that reveals the transited-countries question), and `transporterTypes()` (the transporter-type enum), for the arrival-details page and the transporters select                                                                                                                                                                                                                                                                                              | `features/transport/port-of-entry.controller.js`, `features/transport/transporters.controller.js`, `features/check-answers/controller.js`                                                                                                                 |
| `document-types`         | MDM document/attachment types                                                              | `documentTypes()` for the accompanying-document type select and its validation membership; `attachmentTypes()` — the value domain of the system-derived attachment type, which `features/documents/upload-config.js` resolves from the uploaded file's extension                                                                                                                                                                                                                                                                                         | `features/documents/controller.js`                                                                                                                                                                                                                        |
| `address-book`           | Saved trader parties (gov.identity profiles)                                               | `parties(role)` and `party(role, id)` for each consignment role (consignor, consignee, importer, place-of-origin, destination, contact, commercial transporter), each record carrying a stable id and the full Standard Address Block; `search(role, { query, page })` → one page of matches with `total` / `totalPages`; `PAGE_SIZE`; and `addParty(role, …)` to mint a user-created record. The book owns its own search and pagination — the picker pages render only what it returns                                                                 | `features/addresses/party-picker.controller.js`, `features/addresses/create-address.controller.js`, `features/contact/controller.js`, `features/transport/transporters-select.controller.js`                                                              |
| `document-uploads`       | trade-imports-animals-backend document-upload endpoints (broker for cdp-uploader)          | `upload(details)` → `uploadId`, `scanStatus({ uploadId, … })` → `PENDING` / `COMPLETE` / `REJECTED`, `remove(uploadId)`, and `streamFile(uploadId)` → a fetch `Response` the controller streams back to the browser — the lifecycle behind the documents page                                                                                                                                                                                                                                                                                            | `features/documents/controller.js`                                                                                                                                                                                                                        |

## Commodity applicability lists — `commodities`

The commodity-keyed applicability lists are the V4 commodity lists expressed
in the stored commodity vocabulary, and the model's gates read them through
the same accessors the controllers use — one source, so gate and page can
never disagree. Two list shapes exist in the stub data:

- The identifier/CPH/unweaned lists (`PASSPORT_COMMODITIES`,
  `TATTOO_COMMODITIES`, `EAR_TAG_COMMODITIES`, `HORSE_NAME_COMMODITIES`,
  `PERMANENT_ADDRESS_COMMODITIES`, `UNWEANED_ANIMAL_COMMODITIES`,
  `CPH_COMMODITIES`) are each V4 list **intersected with the selectable
  `COMMODITY_OPTIONS`** — V4 entries with no selectable commodity (Ferrets
  and Pigs on the tattoo list, for example) are omitted, not dormant.
- `PACKAGE_COUNT_COMMODITIES` carries the full 54-entry V4 list; entries for
  commodities outside `COMMODITY_OPTIONS` are unreachable until the commodity
  vocabulary widens.

When commodities come from real MDM, the intersected lists must widen back to
their full V4 sets alongside the vocabulary — the intersection is a stub
narrowing, not a requirement.

## Saved parties — `address-book`

The book returns saved parties per consignment role. Each record has a stable id
and the full Standard Address Block; the commercial-transporter records also
carry an approval number. A chosen party is saved into the notification by copy,
so every field is preserved even if the book later changes.

`parties(role)` merges the vendored records for that role with any created in the
session. `search(role, { query, page })` is a free-text match over each record's
name, address and country and returns one page — `results`, `total`, `page`,
`totalPages`, `pageSize` — with `PAGE_SIZE` fixed at 5 and an out-of-range page
falling back to the first. `addParty(role, { name, address })` mints a new record
with a generated id and appends it to the session's created set. Addressing is a
self-contained stubbed sub-service: the pages hold no records and no paging
maths of their own.

## Document uploads — `document-uploads`

The service drives the upload lifecycle on the documents page. A notification
links documents by `uploadId` reference only; the file bytes never enter the
notification.

**Real mode** (`real.js`) calls the backend at `TRADE_IMPORTS_ANIMALS_BACKEND_URL`:
`upload` POSTs `/notifications/{journeyId}/document-uploads` to initiate, then
POSTs the file to `/document-uploads/{uploadId}/file`; `scanStatus` GETs
`/document-uploads/{uploadId}`; `remove` DELETEs the same; `streamFile` GETs
`/document-uploads/{uploadId}/file` and hands the response back unread so the
controller can stream it. Every request carries the tracing header.

**Stub mode** (`stub.js`) cans the lifecycle and discards the file bytes. It
settles on an explicit refresh signal rather than read counts, because a
server-side gate or render read would otherwise consume the pending state before
the user saw it. Every read answers `PENDING` until a read carries `refresh: true`
— the controller sets it when the GET arrives via the `?attempt=N` refresh link —
at which point the upload settles by filename: a name containing `virus` settles
`REJECTED`, one containing `never-scans` stays `PENDING` through every refresh,
and anything else settles `COMPLETE`. Once settled it stays settled. An unknown
`uploadId` (for example after a restart) settles straight from the filename, and
an entry with no `uploadId` is treated as `COMPLETE`. Holding no bytes, its
`streamFile` serves the same canned one-page PDF for every upload.

Both adapters answer `streamFile` with a fetch `Response`, so the controller
reads `body` and `headers` the same way in either mode.
