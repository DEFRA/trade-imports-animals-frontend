# Services

The service layer keeps option data, uploads and persistence behind small
interfaces. Pages import a service's `index.js`. They do not import its real or
stub adapter.

Paths are relative to `src/server/live-animals/`.

## Run mode

`services/mode.js` reads `LIVE_ANIMALS_MODE`. The default is `real`. Only the
exact value `real` makes `isRealMode()` true. Vitest and the local Playwright
server set `stub`. A local server with no value uses `real`.

The services use three backing patterns:

- **Built in** always reads committed stub data.
- **Selected** exports either a stub or real adapter when the module loads.
- **Primed** starts with committed data, then replaces it from a real client at
  plugin registration.

`routes.js` configures the selected persistence ports. In real mode it also
awaits `countries.prime()` and `ports.prime()` before mounting routes. A failed
prime fails plugin registration. Stub mode makes no prime request.

## Public inventory

This table follows the exports from each public `index.js`.

| Service                  | Public exports                                                                                                                                                                                                                                                                                                                                             | Backing               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `address-book`           | `PAGE_SIZE`, `parties`, `party`, `addParty`, `search`                                                                                                                                                                                                                                                                                                      | Stub in both modes    |
| `certification-purposes` | `certificationPurposes`, `list`, `certificationLabel`                                                                                                                                                                                                                                                                                                      | Stub in both modes    |
| `commodities`            | `list`, `commodityCodeFor`, `commodityNameFor`, `typesFor`, `typeIdForSpecies`, `typeTextForId`, `species`, `speciesLabel`, `speciesFor`, `isCommoditySpecies`, `packageCountCommodities`, `passportCommodities`, `tattooCommodities`, `earTagCommodities`, `horseNameCommodities`, `permanentAddressCommodities`, `unweanedCommodities`, `cphCommodities` | Stub in both modes    |
| `countries`              | `prime`, `originLabel`, `originCountries`, `addressCountries`                                                                                                                                                                                                                                                                                              | Stub, then real prime |
| `document-types`         | `documentTypes`, `attachmentTypes`                                                                                                                                                                                                                                                                                                                         | Stub in both modes    |
| `document-uploads`       | `documentUploads` with `upload`, `scanStatus`, `remove`, `streamFile`                                                                                                                                                                                                                                                                                      | Stub or real          |
| `import-reason-purpose`  | `reasons`, `reasonLabel`, `purposes`, `purposeLabel`                                                                                                                                                                                                                                                                                                       | Stub in both modes    |
| `persistence/records`    | `records` with `create`, `load`, `list`, `has`, `replaceFulfilment`, `finalise`, `amend`, `cancelAmend`, `copy`, `softDelete`, `clear`                                                                                                                                                                                                                     | Stub or real          |
| `persistence/session`    | `session` with `knownJourneyIds`, `addKnownJourney`, `openingRun`, `setOpeningRun`, `flowOnlyAnswers`, `setFlowOnlyAnswers`                                                                                                                                                                                                                                | Stub or real          |
| `ports`                  | `prime`, `list`, `label`                                                                                                                                                                                                                                                                                                                                   | Stub, then real prime |
| `transport-reference`    | `meansOfTransport`, `overlandMeans`, `transporterTypes`                                                                                                                                                                                                                                                                                                    | Stub in both modes    |

`_capture` is support code, not a page-facing service. Its command fetches
countries and ports into committed JSON fixtures. The country and port stubs
seed from those fixtures.

## Built-in services

Built-in services return arrays, labels or lookups from committed modules.
They use the same data in both run modes.

`commodities` also supplies the allowlists used by model gates. Controllers and
the model therefore read the same commodity names. Its identifier, CPH and
unweaned lists contain selectable stub commodities. Its package-count list is
the full committed list.

`address-book` keeps created parties in a module-level `Map`. `parties(role)`
combines them with the built-in role list. `search()` matches name and address
text, returns five rows per page and sends an invalid page back to page 1.
Created parties last only for the life of the process.

## Primed reference data

`countries` starts with `COUNTRY_LABELS`. In real mode, `prime()` calls
`fetchCountries(['GBNAG_SPS_EX'])` and replaces the label map. Its read methods
stay synchronous after boot.

`ports` starts with `PORTS`. In real mode, `prime()` calls
`fetchPortsOfEntry()` and replaces the array. `label(code)` returns
`Name (CODE)` or `undefined`.

Do not read a primed service into a module-scope validation rule. Build the
allowed values for each POST so it sees the data loaded at boot.

## Selected uploads

`document-uploads/index.js` chooses one `documentUploads` object when imported.

The real adapter calls `TRADE_IMPORTS_ANIMALS_BACKEND_URL`. It starts an upload
under the notification, sends the file, reads scan status, deletes an upload
and streams the stored file. It sends the CDP trace ID on each request.

The stub keeps scan state but no file bytes. A new upload stays `PENDING` until
a scan read has `refresh: true`. A filename containing `virus` then becomes
`REJECTED`; one containing `never-scans` stays `PENDING`; other names become
`COMPLETE`. Downloads return one placeholder PDF.

Both adapters return a fetch `Response` from `streamFile()`.

## Selected persistence

The records barrel selects the in-memory map or the backend REST adapter. Both
implement the same records object. The real adapter also exports `mapStatus`
from its deeper real barrel, but pages use the selected object.

The session barrel selects cookie state or `request.yar` state. Both keep known
journey IDs, opening-run state and flow-only answers. See
[persistence.md](persistence.md) for the different real and stub listing
semantics.
