/**
 * Obligations — Live Animals V4 data-field model.
 *
 * Source: Confluence "Live Animals Data Fields - V4" (page 6497338582).
 * Model under test: the obligations model (see ../obligations/). This
 * manifest expresses the V4 domain against that model.
 *
 * Scope mechanism: every obligation with a conditional scope uses
 * `applyTo(fulfilments, fulfilmentIdsByObligationId)`. Common gate
 * shapes are provided as pure helper functions in `helpers.js` —
 * `allowListed`, `notInUnionOf`, `anyAllowListed`, `matches`,
 * `equalsGate`, `presentGate`, `includesGate`, `alwaysInScope` (and
 * `branchedGate` as an escape hatch for genuinely opaque predicates,
 * unused on the manifest today) — that build applyTo functions with
 * metadata attached for optional introspection. One mechanism, one
 * testing story: any obligation's applyTo can be exercised as a plain
 * function call with plain inputs (no evaluator, no resolver, no
 * obligationsById).
 *
 * Helper choice convention:
 *   - `equals`-shape non-total gates → `equalsGate(gate, value, whenTrue, whenFalse)`
 *   - `equals`-shape status-flip (both branches in-scope) → same helper,
 *     both branches with `inScope: true` and different `status`
 *   - `includes`-shape gates → `includesGate(gate, values, whenTrue, whenFalse)`
 *   - `isFilled`-shape gates → `presentGate(gate, whenTrue, whenFalse)`
 * Prefer these over `branchedGate` — the meta-first helpers co-declare
 * the closure body, the metadata sidecar and the dependency graph as a
 * single value, so renaming a gate obligation touches one call site.
 *
 * Dependency declaration: gated obligations may carry an explicit
 * `dependsOn: string[]` schema key OR let it be DERIVED from the applyTo
 * helper's metadata. Meta-first helpers all name their gate obligation
 * on `.metadata.obligation`, so `obligationMetadata()` recovers the
 * dependency graph without duplication. Closures are opaque to a
 * reachability prover; the derived-or-declared `dependsOn` makes the
 * graph explicit data alongside the closure, and the coverage assertion
 * accepts either path.
 *
 * System-populated fields are declared but NOT presented in the flow
 * layer:
 *   - `poApprovedReferenceNumber` — system-minted at notification
 *     creation time. Format `GBN-AG-YY-XXXXXX` (Crockford base32 body).
 * Its value legality is enforced by the system that mints the id, and it
 * is on the `KNOWN_UNWIRED` allow-list in `coverage.test.js` with a reason.
 *
 * MDM-sourced enum values (commodities / species / ports of
 * entry / country of origin / animals-certified-for options) are
 * stubbed in test fixtures rather than modelled as obligations —
 * their real option lists come from MDM in production.
 *
 * Standard address block: modelled as a single-cardinality obligation
 * whose stored value is a composite `{ name, addressLine1,
 * addressLine2?, town, county?, postCode, country, telephone, email }`.
 * Field-level validation of the composite (max-length, formats,
 * mandatory subfields) is out of scope of the obligation model.
 */

import { arrivalDateAtPort, portOfEntry } from './sections/arrival.js'
import {
  cph,
  containsUnweanedAnimals
} from './sections/commodities/aggregates.js'
import {
  description,
  earTag,
  horseName,
  identificationDetails,
  passport,
  permanentAddress,
  tattoo,
  unitRecord
} from './sections/commodities/identifiers.js'
import {
  commodityCode,
  commodityLine,
  commodityType,
  numberOfAnimals,
  numberOfPackages,
  species
} from './sections/commodities/lines.js'
import {
  accompanyingDocumentAttachmentType,
  accompanyingDocumentDateOfIssue,
  accompanyingDocumentReference,
  accompanyingDocumentType,
  documentFilename,
  documents,
  documentUploadId
} from './sections/documents.js'
import {
  destinationCountry,
  exitDate,
  portOfExit,
  purposeInInternalMarket,
  reasonForImport
} from './sections/import-reason.js'
import {
  animalsCertifiedFor,
  contactAddress,
  internalReferenceNumber
} from './sections/misc.js'
import {
  countryOfOrigin,
  regionCode,
  regionCodeRequirement
} from './sections/origin.js'
import {
  consignee,
  consignor,
  importer,
  placeOfDestination,
  placeOfOrigin
} from './sections/parties.js'
import { poApprovedReferenceNumber } from './sections/system.js'
import {
  commercialTransporter,
  meansOfTransport,
  privateTransporter,
  transitedCountries,
  transportDocumentReference,
  transporterType,
  transportIdentification
} from './sections/transport.js'

export {
  accompanyingDocumentAttachmentType,
  accompanyingDocumentDateOfIssue,
  accompanyingDocumentReference,
  accompanyingDocumentType,
  animalsCertifiedFor,
  arrivalDateAtPort,
  commodityCode,
  commodityLine,
  commodityType,
  commercialTransporter,
  consignee,
  consignor,
  contactAddress,
  containsUnweanedAnimals,
  countryOfOrigin,
  cph,
  description,
  destinationCountry,
  documentFilename,
  documents,
  documentUploadId,
  earTag,
  exitDate,
  horseName,
  identificationDetails,
  importer,
  internalReferenceNumber,
  meansOfTransport,
  numberOfAnimals,
  numberOfPackages,
  passport,
  permanentAddress,
  placeOfDestination,
  placeOfOrigin,
  poApprovedReferenceNumber,
  portOfEntry,
  portOfExit,
  privateTransporter,
  purposeInInternalMarket,
  reasonForImport,
  regionCode,
  regionCodeRequirement,
  species,
  tattoo,
  transitedCountries,
  transportDocumentReference,
  transporterType,
  transportIdentification,
  unitRecord
}

// -----------------------------------------------------------------------------
// Manifest — order does not affect evaluation (evaluator builds group
// hierarchy via `within` back-references).
// -----------------------------------------------------------------------------

export const obligations = [
  poApprovedReferenceNumber,
  countryOfOrigin,
  regionCodeRequirement,
  regionCode,
  reasonForImport,
  purposeInInternalMarket,
  destinationCountry,
  portOfExit,
  exitDate,
  containsUnweanedAnimals,
  placeOfOrigin,
  consignor,
  consignee,
  importer,
  placeOfDestination,
  transporterType,
  commercialTransporter,
  privateTransporter,
  meansOfTransport,
  transportIdentification,
  transportDocumentReference,
  transitedCountries,
  arrivalDateAtPort,
  portOfEntry,
  contactAddress,
  internalReferenceNumber,
  animalsCertifiedFor,
  commodityLine,
  commodityCode,
  commodityType,
  species,
  numberOfAnimals,
  numberOfPackages,
  cph,
  unitRecord,
  passport,
  tattoo,
  earTag,
  horseName,
  identificationDetails,
  description,
  permanentAddress,
  documents,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue,
  documentUploadId,
  documentFilename
]

// Groups are obligations that other obligations reference via `within`.
export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

// -----------------------------------------------------------------------------
// Container back-refs — populate `member.containers` for every scalar
// obligation that participates in a `requires.allOrNothingOfIds`
// invariant carrier. The current manifest has zero `allOrNothingOfIds`
// carriers; the loop is retained as a general primitive for any future
// notification-level scalar invariant block. Idempotent — repeated
// imports rebuild the same list.
// -----------------------------------------------------------------------------
for (const container of obligations) {
  if (!container?.requires?.allOrNothingOfIds) {
    continue
  }
  for (const memberId of container.requires.allOrNothingOfIds) {
    const member = obligations.find((candidate) => candidate.id === memberId)
    if (!member) {
      continue
    }
    const existing = member.containers ?? []
    if (
      existing.some(
        (existingContainer) => existingContainer.id === container.id
      )
    ) {
      continue
    }
    // Deliberate exception to the no-in-place-mutation style rule: the
    // back-ref must land on the SAME obligation object instance already
    // referenced elsewhere in the manifest (`within` etc.), so a
    // copy-and-replace here would silently break that shared identity.
    member.containers = existing.concat(container)
  }
}
