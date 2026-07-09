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
 *   - `errors.required` supplies the copy for the required-field error
 *     when `mandatoryToSaveAndContinue` is true. Bare English string
 *     today, matching the rest of the spike's user-facing text — see
 *     NEXT.md P0.5 for spike-wide i18n.
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
  species,
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
      title: 'Country of origin and reason',
      children: [
        {
          kind: 'subsection',
          id: 'origin',
          title: 'Country of origin',
          children: [
            {
              page: 'country-of-origin',
              presents: [
                {
                  obligation: countryOfOrigin,
                  // First worked example of the flow-level
                  // submit-mandate: leaving the field blank on POST
                  // returns a 400 with the flow-supplied message.
                  // See lib/format-domain-errors.js for how `message`
                  // overrides code-keyed copy. Every other presents
                  // entry defaults to `mandatoryToSaveAndContinue: false`
                  // so blank saves-and-continues succeed as they did.
                  mandatoryToSaveAndContinue: true,
                  errors: {
                    required: 'Enter a country of origin'
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
          title: 'Reason for import',
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
      title: 'Transporter and transport',
      children: [
        {
          kind: 'subsection',
          id: 'transporter-type',
          title: 'Transporter type',
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
          title: 'Transport details',
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
      title: 'Arrival',
      children: [
        {
          kind: 'subsection',
          id: 'arrival-at-port',
          title: 'Arrival at port',
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
          title: 'About the animals',
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
          title: 'Animals certified for',
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
      id: 'references',
      title: 'References',
      children: [
        {
          kind: 'subsection',
          id: 'trader-reference',
          title: 'Your reference',
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
      title: 'Commodity lines',
      children: [
        {
          kind: 'subsection',
          id: 'commodity-lines-manage',
          title: 'Add commodity lines',
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
          title: 'Commodity line details',
          children: [
            {
              page: 'commodity-details',
              presentsForEach: {
                obligation: commodityCode,
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
