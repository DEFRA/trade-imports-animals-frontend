/**
 * Flow — Layer 2 of the three-layer architecture.
 *
 * The container hierarchy is Section → SubSection → Page. Every Page
 * lives inside a SubSection; every SubSection lives inside a Section.
 * The task list surfaces subsections; users navigate into them and walk
 * pages in declared order.
 *
 * Presents entries:
 *   { obligation, mandatoryToProceed?: boolean, errors?: object }
 *
 * `presentsForEach` expands to one virtual entry per in-scope
 * group-instance record — used here for the per-commodity-line pages.
 *
 * Property semantics:
 *   - `obligation` is the model-layer obligation the page presents.
 *   - `mandatoryToProceed` (default false) is the *submit-
 *     mandate* — when true, POSTing the page with a blank value for
 *     this obligation returns a 400 with the flow-supplied required
 *     message. Distinct from the obligation's `status` field, which is
 *     the *completion-mandate* (does the journey need this to reach F?).
 *   - `errors.required` supplies a message KEY resolved via
 *     `lib/i18n.js` (`t(key)` → `locales/en.json`). Missing keys
 *     render as the raw dotted-path in the UI; the coverage test in
 *     `i18n-coverage.test.js` walks flow.js and asserts each key is
 *     defined.
 *
 * Section / subsection nodes carry `titleKey` (a message key), not a
 * literal `title`. The hub controller resolves it via `t()`.
 *
 * The V4 slice below is driven by the two ticket drivers, country of
 * origin and commodity code:
 *
 *   - `country-of-origin` is the first page a user hits.
 *   - `transitedCountries` scope depends on means-of-transport.
 *   - Commodity-line pages fan out per commodity line via
 *     `presentsForEach`, and per-line obligations (numberOfPackages,
 *     passport, tattoo, earTag, etc.) come in/out of scope based on
 *     the commodity code chosen for that line.
 */

import {
  reasonForImport,
  purposeInInternalMarket,
  destinationCountry,
  portOfExit,
  exitDate,
  transporterType,
  commercialTransporter,
  privateTransporter,
  meansOfTransport,
  transportIdentification,
  transportDocumentReference,
  transitedCountries,
  arrivalDateAtPort,
  portOfEntry,
  animalsCertifiedFor,
  internalReferenceNumber,
  countryOfOrigin,
  commodityLine,
  commodityCode,
  commodityType,
  species,
  placeOfOrigin,
  consignor,
  consignee,
  importer,
  placeOfDestination,
  contactAddress,
  numberOfAnimals,
  numberOfPackages,
  containsUnweanedAnimals,
  regionCodeRequirement,
  regionCode,
  cph,
  unitRecord,
  permanentAddress,
  passport,
  tattoo,
  earTag,
  horseName,
  identificationDetails,
  description,
  accompanyingDocument,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue,
  obligations as v4Obligations
} from '../obligations/obligations.js'
import { assertObligationTotality } from './boot-totality.js'

export const flow = {
  id: 'live-animals-v4-slice',
  sectionEntryMode: 'firstApplicablePage',
  sections: [
    {
      kind: 'section',
      id: 'origin-and-reason',
      titleKey: 'flow.section.origin-and-reason.title',
      children: [
        {
          kind: 'subsection',
          id: 'origin',
          titleKey: 'flow.subsection.origin.title',
          children: [
            {
              page: 'country-of-origin',
              // V4 spec (Confluence page 6497338582): "Mandatory to
              // submit". No page-save block; completion enforced at
              // journey-submit time via CYA prompts. Was previously
              // marked mandatoryToProceed by mistake — corrected in
              // the spec-conformance mandate audit.
              presents: [{ obligation: countryOfOrigin }]
            },
            {
              page: 'region-code-requirement',
              presents: [{ obligation: regionCodeRequirement }]
            },
            {
              // Obligation is in-scope-mandatory when
              // regionCodeRequirement = 'yes', in-scope-optional
              // otherwise (see obligations.js §Region code); stored
              // value is retained across gate flips.
              // V4: "Mandatory to proceed".
              page: 'region-code',
              presents: [
                {
                  obligation: regionCode,
                  mandatoryToProceed: true,
                  errors: { required: 'errors.regionCode.required' }
                }
              ]
            }
          ]
        },
        {
          kind: 'subsection',
          id: 'reason',
          titleKey: 'flow.subsection.reason.title',
          children: [
            {
              page: 'reason-for-import',
              presents: [{ obligation: reasonForImport }]
            },
            {
              // Question visibility: rendered but out-of-scope (NA) when
              // reasonForImport !== 'internal-market' — the obligation's
              // applyTo drives that; the flow just presents it.
              // V4: "Mandatory to proceed".
              page: 'purpose-details',
              presents: [
                {
                  obligation: purposeInInternalMarket,
                  mandatoryToProceed: true,
                  errors: {
                    required: 'errors.purposeInInternalMarket.required'
                  }
                }
              ]
            },
            {
              // NA unless reasonForImport ∈ { transit,
              // transhipment-or-onward-travel }. V4: "Mandatory to
              // proceed".
              page: 'destination-country',
              presents: [
                {
                  obligation: destinationCountry,
                  mandatoryToProceed: true,
                  errors: {
                    required: 'errors.destinationCountry.required'
                  }
                }
              ]
            },
            {
              // NA unless reasonForImport ∈ { transit,
              // temporary-admission-horses }. V4: "Mandatory to proceed".
              page: 'port-of-exit',
              presents: [
                {
                  obligation: portOfExit,
                  mandatoryToProceed: true,
                  errors: {
                    required: 'errors.portOfExit.required'
                  }
                }
              ]
            },
            {
              // NA unless reasonForImport = temporary-admission-horses.
              // V4: "Mandatory to proceed".
              page: 'exit-date',
              presents: [
                {
                  obligation: exitDate,
                  mandatoryToProceed: true,
                  errors: {
                    required: 'errors.exitDate.required'
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      kind: 'section',
      id: 'transporter',
      titleKey: 'flow.section.transporter.title',
      children: [
        {
          kind: 'subsection',
          id: 'transporter-type',
          titleKey: 'flow.subsection.transporter-type.title',
          children: [
            {
              page: 'transporter-type',
              presents: [{ obligation: transporterType }]
            },
            {
              // Two obligations on one page — only one of them is ever in
              // scope depending on transporterType. Question visibility
              // via obligation scope, no flow-side branching required.
              //
              // V4: both are "Mandatory to proceed" (Confluence page
              // 6497338582 rows 110 + 119) → user cannot save-and-
              // continue with a blank or partial address. The
              // mandatoryToProceed gate in contract.js consults
              // `domainEntry.isComplete(value)` for address
              // obligations, so blank AND partial submissions both
              // fire the required error at page save.
              //
              // The other 5 address obligations (placeOfOrigin,
              // consignor, consignee, importer, placeOfDestination)
              // stay "Mandatory to submit" — they save blank and rely
              // on the CYA `promptCompleteAddress` prompt for
              // completeness. See routes.test.js for the two
              // behavioural regressions.
              page: 'transporter-details',
              presents: [
                {
                  obligation: commercialTransporter,
                  mandatoryToProceed: true,
                  errors: { required: 'errors.commercialTransporter.required' }
                },
                {
                  obligation: privateTransporter,
                  mandatoryToProceed: true,
                  errors: { required: 'errors.privateTransporter.required' }
                }
              ]
            }
          ]
        },
        {
          kind: 'subsection',
          id: 'transport',
          titleKey: 'flow.subsection.transport.title',
          children: [
            {
              // V4: "Mandatory to proceed".
              page: 'means-of-transport',
              presents: [
                {
                  obligation: meansOfTransport,
                  mandatoryToProceed: true,
                  errors: { required: 'errors.meansOfTransport.required' }
                }
              ]
            },
            {
              page: 'transport-identification',
              presents: [
                { obligation: transportIdentification },
                { obligation: transportDocumentReference }
              ]
            },
            {
              // In-scope-optional when meansOfTransport is railway or
              // road-vehicle; out-of-scope otherwise. Domain caps at 12.
              page: 'transited-countries',
              presents: [{ obligation: transitedCountries }]
            }
          ]
        }
      ]
    },
    {
      kind: 'section',
      id: 'arrival',
      titleKey: 'flow.section.arrival.title',
      children: [
        {
          kind: 'subsection',
          id: 'arrival-at-port',
          titleKey: 'flow.subsection.arrival-at-port.title',
          children: [
            {
              page: 'arrival-details',
              presents: [
                { obligation: arrivalDateAtPort },
                { obligation: portOfEntry }
              ]
            }
          ]
        },
        {
          kind: 'subsection',
          id: 'certified-for',
          titleKey: 'flow.subsection.certified-for.title',
          children: [
            {
              // Options are stubbed statically in the spike; in
              // production the certificate integration supplies them.
              page: 'animals-certified-for',
              presents: [{ obligation: animalsCertifiedFor }]
            }
          ]
        }
      ]
    },
    {
      kind: 'section',
      id: 'trader-details',
      titleKey: 'flow.section.trader-details.title',
      children: [
        {
          kind: 'subsection',
          id: 'origin-details',
          titleKey: 'flow.subsection.origin-details.title',
          children: [
            {
              page: 'place-of-origin',
              presents: [{ obligation: placeOfOrigin }]
            },
            {
              page: 'consignor',
              presents: [{ obligation: consignor }]
            }
          ]
        },
        {
          kind: 'subsection',
          id: 'destination-details',
          titleKey: 'flow.subsection.destination-details.title',
          children: [
            {
              page: 'consignee',
              presents: [{ obligation: consignee }]
            },
            {
              page: 'importer',
              presents: [{ obligation: importer }]
            },
            {
              page: 'place-of-destination',
              presents: [{ obligation: placeOfDestination }]
            }
          ]
        }
      ]
    },
    {
      kind: 'section',
      id: 'references',
      titleKey: 'flow.section.references.title',
      children: [
        {
          kind: 'subsection',
          id: 'contact',
          titleKey: 'flow.subsection.contact.title',
          children: [
            {
              // V4: Mandatory to proceed (Confluence page 6497338582
              // row 143 — user-entered variant). Blank AND partial
              // submissions fail page save via the contract.js
              // mandatoryToProceed gate consulting
              // `domainEntry.isComplete`. See the transporter-details
              // entry above for the wider rationale.
              page: 'contact-address',
              presents: [
                {
                  obligation: contactAddress,
                  mandatoryToProceed: true,
                  errors: { required: 'errors.contactAddress.required' }
                }
              ]
            }
          ]
        },
        {
          kind: 'subsection',
          id: 'trader-reference',
          titleKey: 'flow.subsection.trader-reference.title',
          children: [
            {
              page: 'internal-reference',
              presents: [{ obligation: internalReferenceNumber }]
            }
          ]
        },
        {
          // Accompanying-document block (WS4 shape). Records-shape user-
          // driven group — traders can attach 0..10 documents per
          // notification, each with all four fields mandatory. Same
          // fan-out pattern as commodity-lines: a bespoke summary/add/
          // delete controller (`features/accompanying-documents/`)
          // handles `/accompanying-documents` and its add / delete
          // endpoints; the four per-document pages below fan out via
          // presentsForEach on `accompanyingDocument`.
          //
          // `requires.maxEntries: 10` on the group is authoritative for
          // the cap; the summary controller mirrors it by greying out
          // the Add button once the user is at 10.
          kind: 'subsection',
          id: 'accompanying-documents',
          titleKey: 'flow.subsection.accompanying-documents.title',
          children: [
            {
              page: 'accompanying-document-type',
              presentsForEach: {
                obligation: accompanyingDocumentType,
                forEachOf: accompanyingDocument,
                mandatoryToProceed: true,
                errors: { required: 'errors.accompanyingDocumentType.required' }
              }
            },
            {
              page: 'accompanying-document-attachment',
              presentsForEach: {
                obligation: accompanyingDocumentAttachmentType,
                forEachOf: accompanyingDocument,
                mandatoryToProceed: true,
                errors: {
                  required: 'errors.accompanyingDocumentAttachmentType.required'
                }
              }
            },
            {
              page: 'accompanying-document-reference',
              presentsForEach: {
                obligation: accompanyingDocumentReference,
                forEachOf: accompanyingDocument,
                mandatoryToProceed: true,
                errors: {
                  required: 'errors.accompanyingDocumentReference.required'
                }
              }
            },
            {
              page: 'accompanying-document-date-of-issue',
              presentsForEach: {
                obligation: accompanyingDocumentDateOfIssue,
                forEachOf: accompanyingDocument,
                mandatoryToProceed: true,
                errors: {
                  required: 'errors.accompanyingDocumentDateOfIssue.required'
                }
              }
            }
          ]
        }
      ]
    },
    {
      kind: 'section',
      id: 'commodity-lines',
      titleKey: 'flow.section.commodity-lines.title',
      children: [
        {
          kind: 'subsection',
          id: 'commodity-lines-manage',
          titleKey: 'flow.subsection.commodity-lines-manage.title',
          children: [
            {
              // Read-only intro — NA in status terms; renders for
              // narrative continuity. The Add / List / Delete actions
              // live under bespoke `/lines` routes rather than in the
              // flow itself — see browser/line-controllers.js.
              page: 'commodity-lines-intro'
            }
          ]
        },
        {
          kind: 'subsection',
          id: 'commodity-lines-details',
          titleKey: 'flow.subsection.commodity-lines-details.title',
          children: [
            {
              // V4: "Mandatory to proceed" per the Commodity selection
              // row. Same applies to Type / Species / Number of
              // animals below.
              page: 'commodity-details',
              presentsForEach: {
                obligation: commodityCode,
                forEachOf: commodityLine,
                mandatoryToProceed: true,
                errors: { required: 'errors.commodityCode.required' }
              }
            },
            {
              page: 'commodity-type',
              presentsForEach: {
                obligation: commodityType,
                forEachOf: commodityLine,
                mandatoryToProceed: true,
                errors: { required: 'errors.commodityType.required' }
              }
            },
            {
              page: 'species-details',
              presentsForEach: {
                obligation: species,
                forEachOf: commodityLine,
                mandatoryToProceed: true,
                errors: { required: 'errors.species.required' }
              }
            },
            {
              page: 'number-of-animals',
              presentsForEach: {
                obligation: numberOfAnimals,
                forEachOf: commodityLine,
                mandatoryToProceed: true,
                errors: { required: 'errors.numberOfAnimals.required' }
              }
            },
            {
              // Conditional per line — in scope only when the line's
              // commodityCode is in the package-count whitelist.
              page: 'number-of-packages',
              presentsForEach: {
                obligation: numberOfPackages,
                forEachOf: commodityLine
              }
            }
          ]
        },
        {
          // Depth-2 per-unit records. Conditional per line — in scope
          // only when the line's commodityCode opens a unit-scoped
          // obligation (currently 01061900 for permanentAddress; step
          // 5 will add passport, tattoo, earTag ...). The subsection
          // rolls up NA whenever no line has a unit-scoped obligation
          // in scope. Task-list clickthrough goes to `/lines` (see
          // hub controller subsectionHref); from there the user picks
          // a line and manages its animals at `/lines/{lineId}/units`.
          kind: 'subsection',
          id: 'per-unit-records',
          titleKey: 'flow.subsection.per-unit-records.title',
          children: [
            {
              page: 'permanent-address',
              presentsForEach: {
                obligation: permanentAddress,
                forEachOf: unitRecord
              }
            },
            {
              // Per-unit identifiers wired in iteration 10. Each is
              // optional (completion-mandate) and gated to specific
              // commodity codes via the obligation's applyTo:
              //   passport         → horse / cattle / pet
              //   tattoo           → pet / pig / cattle
              //   earTag           → cattle / pig / sheep / goat
              //   horseName        → horse only
              // A given unit only sees the pages for its parent line's
              // commodity code — pageStatus rolls them out of scope
              // for units whose code isn't on the whitelist. Ordering
              // matches obligations.js declaration order.
              page: 'passport',
              presentsForEach: {
                obligation: passport,
                forEachOf: unitRecord
              }
            },
            {
              page: 'tattoo',
              presentsForEach: {
                obligation: tattoo,
                forEachOf: unitRecord
              }
            },
            {
              page: 'ear-tag',
              presentsForEach: {
                obligation: earTag,
                forEachOf: unitRecord
              }
            },
            {
              page: 'horse-name',
              presentsForEach: {
                obligation: horseName,
                forEachOf: unitRecord
              }
            },
            {
              // Inverse-gate fallback pages — apply on units whose
              // parent line's commodity code is NOT in any specific-
              // identifier whitelist (e.g. birds of prey, bees).
              // First wired obligations using allowListedByPredicate;
              // browser-side helpers evaluate the predicate via the
              // metadata sidecar (see obligations/helpers.js).
              page: 'identification-details',
              presentsForEach: {
                obligation: identificationDetails,
                forEachOf: unitRecord
              }
            },
            {
              page: 'description',
              presentsForEach: {
                obligation: description,
                forEachOf: unitRecord
              }
            }
          ]
        },
        {
          // County Parish Holding (CPH). Notification-level (one entry
          // per notification, not per line), but only in scope when the
          // consignment includes a commodity requiring CPH tracking —
          // cattle, pig, sheep, goat, or any poultry code. The
          // obligation's applyTo (obligations.js:508) uses
          // `anyAllowListed` over the active commodity codes, so the
          // subsection is NA until such a line has been added.
          //
          // Slotted at the end of the commodity-lines section (not
          // References) so the task list flows naturally: users add
          // their lines, fill each line's details / per-unit records,
          // and if a CPH-triggering commodity is present the CPH step
          // appears here at the end of the section they were already
          // working through — rather than making them jump back up to
          // References.
          kind: 'subsection',
          id: 'cph',
          titleKey: 'flow.subsection.cph.title',
          children: [
            {
              page: 'cph',
              presents: [{ obligation: cph }]
            }
          ]
        },
        {
          // About the animals — currently just contains-unweaned-
          // animals. Notification-level yes/no, gated on the active
          // commodity codes (equines / cattle / pigs / sheep / goats
          // per audit #11). Same "only in scope after a matching
          // commodity line is added" pattern as CPH above; slotted
          // here at the end of the Commodity lines section for the
          // same UX reason — the user doesn't need to jump back up
          // to Arrival to answer it. The subsection title stays
          // "About the animals" to leave room for adjacent animal-
          // welfare questions in future.
          kind: 'subsection',
          id: 'unweaned',
          titleKey: 'flow.subsection.unweaned.title',
          children: [
            {
              page: 'contains-unweaned-animals',
              presents: [{ obligation: containsUnweanedAnimals }]
            }
          ]
        }
      ]
    }
  ]
}

// ---------------------------------------------------------------------------
// Convenience helpers — small pure functions used by controllers, tests
// and the data-dictionary sketch. Kept co-located so the shape of the
// flow is discoverable from one file.
// ---------------------------------------------------------------------------

const isPage = (node) => node.page !== undefined

/** Every page in the flow, depth-first in declared order. */
export function walkPages(node = flow) {
  const out = []
  const visit = (n) => {
    if (isPage(n)) out.push(n)
    for (const child of n.children ?? n.sections ?? []) visit(child)
  }
  visit(node)
  return out
}

/** Every subsection in the flow, in declared order. */
export function walkSubsections(node = flow) {
  const out = []
  const visit = (n) => {
    if (n.kind === 'subsection') out.push(n)
    for (const child of n.children ?? n.sections ?? []) visit(child)
  }
  visit(node)
  return out
}

/** The section a subsection belongs to (or null if unknown). */
export function sectionOfSubsection(subsectionId) {
  for (const section of flow.sections) {
    if ((section.children ?? []).some((c) => c.id === subsectionId)) {
      return section
    }
  }
  return null
}

/** The subsection a page belongs to (or null if unknown). */
export function subsectionOfPage(pageName) {
  for (const section of flow.sections) {
    for (const subsection of section.children ?? []) {
      if ((subsection.children ?? []).some((c) => c.page === pageName)) {
        return subsection
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Boot-time obligation → page totality assert (EUDPA-288 Phase 4 commit 2,
// BRIEF §Migration #4 + REPORT §5.2). Ported from A's
// `prototypes/standalone/live-animals/flow/dispatch.js:55-63` over B's
// `presents` / `presentsForEach` tree.
//
// Fires ONCE at flow-module-load time — the very first `import` of
// this file halts if any obligation is authored in the manifest but
// not referenced by any page. Closes B's silent-invisibility seam:
// today an orphan obligation just sits there, uncollected, with no
// symptom until a smoke walk. The exclusion policy (structural group
// containers + system-populated fields) is documented on
// `boot-totality.js`.
// ---------------------------------------------------------------------------

assertObligationTotality(v4Obligations, flow)
