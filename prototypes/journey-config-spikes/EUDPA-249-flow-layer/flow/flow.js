/**
 * Flow — Layer 2 of the three-layer architecture.
 *
 * The container hierarchy is Section → SubSection → Page. Every Page
 * lives inside a SubSection; every SubSection lives inside a Section.
 * The task list surfaces subsections; users navigate into them and walk
 * pages in declared order.
 *
 * Presents entries:
 *   { obligation, mandatoryToSaveAndContinue?: boolean, errors?: object }
 *
 * `presentsForEach` expands to one virtual entry per in-scope
 * group-instance record — used here for the per-commodity-line pages.
 *
 * Property semantics:
 *   - `obligation` is the model-layer obligation the page presents.
 *   - `mandatoryToSaveAndContinue` (default false) is the *submit-
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
  regionCode
} from '../obligations/obligations.js'

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
              presents: [
                {
                  obligation: countryOfOrigin,
                  // First worked example of the flow-level
                  // submit-mandate: leaving the field blank on POST
                  // returns a 400 with the flow-supplied message.
                  // The `required` value is a message key resolved via
                  // `lib/i18n.js` — see `locales/en.json`. Missing keys
                  // render as the dotted path in the UI and are
                  // caught in CI by `i18n-coverage.test.js`.
                  mandatoryToSaveAndContinue: true,
                  errors: {
                    required: 'errors.countryOfOrigin.required'
                  }
                }
              ]
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
              page: 'region-code',
              presents: [{ obligation: regionCode }]
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
              page: 'purpose-details',
              presents: [{ obligation: purposeInInternalMarket }]
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
              page: 'transporter-details',
              presents: [
                { obligation: commercialTransporter },
                { obligation: privateTransporter }
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
              page: 'means-of-transport',
              presents: [{ obligation: meansOfTransport }]
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
          id: 'unweaned',
          titleKey: 'flow.subsection.unweaned.title',
          children: [
            {
              page: 'contains-unweaned-animals',
              presents: [{ obligation: containsUnweanedAnimals }]
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
              page: 'contact-address',
              presents: [{ obligation: contactAddress }]
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
              page: 'commodity-details',
              presentsForEach: {
                obligation: commodityCode,
                forEachOf: commodityLine
              }
            },
            {
              page: 'commodity-type',
              presentsForEach: {
                obligation: commodityType,
                forEachOf: commodityLine
              }
            },
            {
              page: 'species-details',
              presentsForEach: {
                obligation: species,
                forEachOf: commodityLine
              }
            },
            {
              page: 'number-of-animals',
              presentsForEach: {
                obligation: numberOfAnimals,
                forEachOf: commodityLine
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
