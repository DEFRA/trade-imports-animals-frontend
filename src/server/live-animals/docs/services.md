# Services

The service layer is the seam between the journey and its backing systems:
reference-data (MDM) option lists, saved addresses, and document uploads. Each
backing system gets one folder under `services/<name>/`, and the controllers
depend only on that folder's interface. The model carries no display copy and no
value lists.

## Folder-per-service

Each service is a folder with a fixed shape:

- `services/<name>/index.js` — the interface the controllers call.
- `services/<name>/stub.js` — the built-in reference data: the code→label maps
  and option arrays that stand in for the real backing system.
- `services/<name>/client.js` or `real.js` — present only where a real backend
  exists (`countries`, `ports`, `document-uploads`, and the persistence
  services). It fetches or calls the live system.

`stub.js` and `real.js` may instead be `stub/` and `real/` folders with
`index.js` barrels when their data warrants splitting.

For the reference-data services (`countries`, `ports`), `stub.js` does not
hand-author its list — it seeds from a committed captured fixture. `_capture/capture.js`
snapshots the live reference-data into `_capture/fixtures/*.json`, and
`_capture/fixtures.js` loads them; the stubs derive `COUNTRY_LABELS` / `PORTS`
from that single canonical dataset, so the canned stub data and the captured
real data cannot drift. The network-boundary tests (`run-mode.test.js`)
deliberately keep small synthetic payloads instead of the fixture — they assert
`prime()` _replaces_ the stub, which needs the fetched data to differ from it.

Controllers import `services/<name>/index.js` and nothing deeper, so the data
source can change behind the interface without touching a page.

## Run mode

One environment variable, `LIVE_ANIMALS_MODE` (`stub` | `real`, default `real`),
decides what backs the seam. It is read in `services/mode.js`, which exports
`mode()` and `isRealMode()`. Two wiring patterns sit behind that switch.

**Prime-at-boot** — `countries` and `ports`. The `index.js` holds mutable module
state seeded from `stub.js`, and exposes an async `prime()`. In real mode
`prime()` fetches from reference-data (`client.js`) and replaces the seed; in
stub mode it returns immediately. `routes.js` `register` awaits each `prime()`
at boot, so the interface stays synchronous for every consumer and a failed
fetch fails boot loudly. Stub mode never calls the network.

Services with no real backend serve their built-in data in both modes.

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

`parties(role)` merges the built-in records for that role with created records.
`search(role, { query, page })` is a free-text match over each record's
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
