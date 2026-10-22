# Platform services

Services implement IO and reference-data access below the engine. The engine never
imports them directly; L1 injects adapters into engine ports.

## Run mode

`isStubMode()` in
[`src/server/common/services/mode.js`](../../common/services/mode.js) selects stub
or real. Service barrels ask it directly where both implementations exist.

It is one service-wide switch, `STUB_MODE`, which also decides how a trader signs
in — a stub run serves stub data and signs its own session, a real run uses the
real services and Defra ID. The module reads the switch through config and refuses
it in production.

## Reference services

Platform services include:

- [`countries`](../services/countries/index.js)
- [`ports`](../services/ports/index.js)
- [`document-uploads`](../services/document-uploads/index.js)
- [`cdp-uploader`](../services/cdp-uploader/index.js)
- [`address-book`](../services/address-book/index.js)
- [`transport-reference`](../services/transport-reference/index.js)
- [`import-reason-purpose`](../services/import-reason-purpose/index.js)
- [`document-types`](../services/document-types/index.js)
- [`certification-purposes`](../services/certification-purposes/index.js)

Countries and ports expose `prime()` operations. The set's gateway
(`routes-<set-id>.js`, re-exported by the `routes.js` barrel) primes them when
the application runs in real mode, before Hapi routes are registered.

Document types and certification purposes answer from a local fixture in both
run modes, so they have no real implementation to select between.

Uploading a document takes both upload services. `cdp-uploader` opens the
upload session the browser posts the file to and reads back what it submitted;
`document-uploads` registers that session against the notification on the
backend and claims it once the trader has answered the document's own
questions.

A stub run holds the scan lifecycle and nothing else — no uploaded bytes — so
downloading a document there serves the same placeholder PDF whichever document
is asked for.

[`set-context`](../services/set-context/index.js) is not an IO service: it
re-exports the active set id so the model can read it without crossing the
`model-import-boundary` rule in `.dependency-cruiser.cjs`.

## Transporters

[`transporters`](../services/transporters/index.js) holds the transporters the
service ships and the ones an organisation adds for itself. The address book
has no field for a transporter's approval number, so neither list lives there.

- The shipped list is a local fixture, read synchronously.
- An organisation's added transporters are held in process memory, keyed on
  the organisation and never on the user or session. They do not survive a
  restart and are not shared between instances until a transporter register
  service exists; the pages only call `partiesFor` and `rememberTransporter`,
  so that service can replace the module without changing them.
- The two commercial fixtures carry status `APPROVED` as a placeholder: no
  register has said what status they hold.

## Persistence adapters

[`src/server/app/services/persistence/`](../services/persistence/) implements the
records and session contracts. L1 passes the selected adapters to
`configureRecords()` and `configureSession()`.

The records adapter owns canonical storage and backend notification projections.
The session adapter owns known journey ids, opening-run state and flow-only answers.
See [Persistence](persistence.md).

## Set-owned services

Reference data that only makes sense for one obligation set belongs to that set.
The live-animals commodities service is documented in the
[live-animals services guide](../sets/live-animals/docs/services.md).

## Configuration

| Convict key                             | Env var                             | Default                                                       |
| --------------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| `tradeImportsAnimalsBackendApi.baseUrl` | `TRADE_IMPORTS_ANIMALS_BACKEND_URL` | `http://localhost:8085`                                       |
| `tradeImportsReferenceDataApi.baseUrl`  | `TRADE_IMPORTS_REFERENCE_DATA_URL`  | `http://localhost:8086`                                       |
| `tradeImportsAddressBookApi.baseUrl`    | `TRADE_IMPORTS_ADDRESS_BOOK_URL`    | `http://localhost:8089`                                       |
| `cdpUploader.baseUrl`                   | `CDP_UPLOADER_BASE_URL`             | `http://localhost:7337`                                       |
| `cdpUploader.scanResultCallbackUrl`     | `CDP_UPLOADER_CALLBACK_URL`         | `http://localhost:8085/document-uploads/pending/scan-results` |
| `cdpUploader.documentsBucket`           | `CDP_UPLOADER_DOCUMENTS_BUCKET`     | `trade-imports-animals-documents`                             |
| `tradeImportsInsFrontend.baseUrl`       | `TRADE_IMPORTS_INS_FRONTEND_URL`    | `http://localhost:3002`                                       |

`tradeImportsInsFrontend.baseUrl` is browser-visible (the service navigation's
Address book link and the address handshake), so under the workspace stack it
stays `localhost` while the backend, reference-data and address-book URLs use
`host.docker.internal`.

`cdpUploader.scanResultCallbackUrl` is resolved by cdp-uploader itself, not by
this service or the browser, so it has to name the backend from inside the
platform's network. Left at its localhost default, cdp-uploader scans the file
and posts the result nowhere, and the document stays pending for good.
