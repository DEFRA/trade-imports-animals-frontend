/**
 * Flow — Layer 2 of the three-layer architecture.
 *
 * The container hierarchy is Section → SubSection → Page. Every Page
 * lives inside a SubSection; every SubSection lives inside a Section.
 * The task list surfaces subsections; users navigate into them and walk
 * pages in declared order.
 *
 * Presents entries:
 *   { obligation, mandate?: 'hard' | 'soft' }        — top-level
 *   { obligation, path, mandate? }                   — group-scoped
 *
 * `presentsForEach` expands to one virtual entry per in-scope
 * group-instance record — used here for the per-commodity-line pages.
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
  numberOfPackages
} from './obligations/obligations.js'

import { certifiedForOptionsLookup } from './domain.js'

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
              presents: [{ obligation: countryOfOrigin, mandate: 'hard' }]
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
              presents: [{ obligation: reasonForImport, mandate: 'hard' }]
            },
            {
              // Question visibility: rendered but out-of-scope (NA) when
              // reasonForImport !== 'internal-market' — the obligation's
              // applyTo drives that; the flow just presents it.
              page: 'purpose-details',
              presents: [
                { obligation: purposeInInternalMarket, mandate: 'hard' }
              ]
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
              presents: [{ obligation: transporterType, mandate: 'hard' }]
            },
            {
              // Two obligations on one page — only one of them is ever in
              // scope depending on transporterType. Question visibility
              // via obligation scope, no flow-side branching required.
              page: 'transporter-details',
              presents: [
                { obligation: commercialTransporter, mandate: 'hard' },
                { obligation: privateTransporter, mandate: 'hard' }
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
              presents: [{ obligation: meansOfTransport, mandate: 'hard' }]
            },
            {
              page: 'transport-identification',
              presents: [
                { obligation: transportIdentification, mandate: 'hard' },
                { obligation: transportDocumentReference, mandate: 'hard' }
              ]
            },
            {
              // In-scope-optional when meansOfTransport is railway or
              // road-vehicle; out-of-scope otherwise. Domain caps at 12.
              page: 'transited-countries',
              presents: [{ obligation: transitedCountries, mandate: 'soft' }]
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
                { obligation: arrivalDateAtPort, mandate: 'hard' },
                { obligation: portOfEntry, mandate: 'hard' }
              ]
            }
          ]
        },
        {
          kind: 'subsection',
          id: 'certified-for',
          title: 'Animals certified for',
          children: [
            {
              // Async-driven options: the lookup obligation must be
              // fulfilled (by the orchestrator) before options are
              // non-empty.
              page: 'animals-certified-for',
              presents: [
                { obligation: certifiedForOptionsLookup, mandate: 'soft' },
                { obligation: animalsCertifiedFor, mandate: 'hard' }
              ]
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
              presents: [
                { obligation: internalReferenceNumber, mandate: 'soft' }
              ]
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
                forEachOf: commodityLine,
                mandate: 'hard'
              }
            },
            {
              page: 'species-details',
              presentsForEach: {
                obligation: species,
                forEachOf: commodityLine,
                mandate: 'hard'
              }
            },
            {
              page: 'number-of-animals',
              presentsForEach: {
                obligation: numberOfAnimals,
                forEachOf: commodityLine,
                mandate: 'hard'
              }
            },
            {
              // Conditional per line — in scope only when the line's
              // commodityCode is in the package-count whitelist.
              page: 'number-of-packages',
              presentsForEach: {
                obligation: numberOfPackages,
                forEachOf: commodityLine,
                mandate: 'soft'
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
