/**
 * flow-reachability.js — the FLOW-level reachability prover for B.
 *
 * B's graph prover (`model/analysis/reachability.js`) proves the obligation
 * DEPENDENCY graph terminates at a seed and every gate has a value-level
 * witness. It says nothing about PAGES: whether an in-scope obligation is
 * presented by a page, and whether that page is reachable through the flow
 * gates in the state that puts the obligation in scope. Those two checks were
 * the value A's retired `analysis/reachability.js` carried over the graph
 * prover; this module ports them onto B's manifest + the flow tree.
 *
 * Two problem kinds, matching A's prover verbatim:
 *   - `no-owning-page`                 an obligation is in scope but no page
 *                                      presents it (dispatch has no owner).
 *   - `owning-page-unreachable-in-scope` the owning page is not reached by the
 *                                      flow gates in that same state.
 * Plus the enumeration's own completeness check (`proveScopeCompleteness`) —
 * A's third problem kind (`no-witness-puts-in-scope`) recast for the
 * seed-driven port: a manifest obligation no seed variant × scope state ever
 * scopes is reported rather than silently skipped.
 *
 * B-native throughout: scope comes from `engine`'s `makeScope` (B's evaluator
 * projected into A's pathKey grammar), page ownership from `flow/dispatch.js`,
 * and page reachability from `analysis/simulate.js`'s `simulateJourney` (which
 * walks the section/page gates over `makeScope`). No A evaluator, registry or
 * predicate is read.
 */

import { pageOfObligation } from '../flow/dispatch.js'
import { SYSTEM_POPULATED } from '../flow/obligation-source.js'
import { obligations } from '../model/obligations/obligations.js'
import { makeScope } from '../engine/index.js'
import { simulateJourney } from './simulate.js'

/**
 * The scope-determining flags whose cross-product spans B's conditional
 * obligations moving into and out of scope: the region-code requirement, the
 * import reason, the means of transport and the transporter type. 2×2×2×3 = 24
 * states — the same small finite space A's prover enumerated. Ported unchanged
 * from A's `analysis/reachability.js`.
 *
 * @returns {Array<object>} 24 partial answer states.
 */
export const enumerateScopeStates = () =>
  ['no', 'yes'].flatMap((regionOfOriginCodeRequirement) =>
    ['', 'internalMarket'].flatMap((reasonForImport) =>
      ['', 'Road Vehicle'].flatMap((meansOfTransport) =>
        ['', 'Commercial', 'Private'].map((transporterType) => ({
          regionOfOriginCodeRequirement,
          reasonForImport,
          meansOfTransport,
          transporterType
        }))
      )
    )
  )

const withoutBlanks = (state) =>
  Object.fromEntries(Object.entries(state).filter(([, value]) => value !== ''))

/**
 * A maximal happy-path answer set that puts (almost) every obligation in
 * scope, overlaid per state with the scope-flag cross-product above. Ported
 * from A's `analysis/reachability.js` `submitReadySeed`; A-answer-shaped, which
 * is exactly what `makeScope` consumes (its `answersToFulfilments` normalises
 * A vocab into B's on the way into the evaluator).
 */
export const submitReadySeed = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'no',
  reasonForImport: 'internalMarket',
  purposeInInternalMarket: 'breeding',
  animalsCertifiedFor: 'slaughter',
  containsUnweanedAnimals: 'no',
  countyParishHoldingCph: '12/345/6789',
  commodityLines: [
    {
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
    }
  ],
  consignor: {
    name: 'Astra Rosales',
    address: {
      addressLine1: '43 East Hague Extension',
      country: 'Switzerland'
    }
  },
  placeOfDestination: {
    name: 'Tech Imports Ltd',
    address: { addressLine1: '643 Main Street', country: 'United Kingdom' }
  },
  placeOfOrigin: {
    name: 'Origin Farm',
    address: { addressLine1: '1 Farm Lane', country: 'Ireland' }
  },
  consignee: {
    name: 'British Livestock Ltd',
    address: {
      addressLine1: '10 Market Street',
      country: 'United Kingdom'
    }
  },
  importer: {
    name: 'Import Co UK',
    address: { addressLine1: '20 Trade Road', country: 'United Kingdom' }
  },
  portOfEntry: 'GB ABD',
  arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
  meansOfTransport: 'Airplane',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721',
  transporterType: 'Commercial',
  commercialTransporter: {
    name: 'García Livestock Transport SL',
    address: {
      addressLine1: '43 East Hague Extension',
      country: 'Switzerland'
    },
    approvalNumber: 'ES-T2-45001294'
  },
  contactAddress: {
    name: 'Animal and Plant Health Agency',
    address: { addressLine1: 'Woodham Lane', country: 'United Kingdom' }
  },
  declaration: 'confirmed'
}

/**
 * Seed variants — overlays on `submitReadySeed` whose commodity/documents
 * choices open the gates the base seed leaves shut. The base seed's single
 * Cow (0102) line never scopes the 0101-gated `horseName`, the 01061900-gated
 * `permanentAddress`, the `notInUnionOf` free-text identifiers (0102 sits in
 * the passport∪tattoo∪earTag union) or the four per-document leaves (no
 * `documents` records). Values are the services' real canned data
 * (`services/commodities`, `services/document-types`) — the same vocabulary
 * the pages store.
 *
 * Both provers run every variant × every scope state, so page reachability
 * is proven in the states these variants create, and `proveScopeCompleteness`
 * fails loudly when a manifest obligation is scoped by NO variant/state pair.
 *
 * @returns {Array<{ id: string, answers: object }>} named answer sets.
 */
export const seedVariants = () => [
  { id: 'base', answers: submitReadySeed },
  {
    // 0101: horseName (and passport) per unit record.
    id: 'horse-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        {
          commoditySelection: 'Horse',
          speciesSelection: '822332',
          numberOfPackages: '2',
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierPassport: 'GB-2026-0001' }]
        }
      ]
    }
  },
  {
    // 01061900: permanentAddress (mandatory when in scope) per unit record.
    id: 'cat-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        {
          commoditySelection: 'Cat',
          speciesSelection: '923501',
          numberOfPackages: '1',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierPassport: 'GB-2026-0002' }]
        }
      ]
    }
  },
  {
    // 0301 is outside the specific-identifier union — the notInUnionOf
    // free-text identifiers (identificationDetails, description) apply.
    id: 'fish-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        {
          commoditySelection: 'Fish',
          speciesSelection: '801204',
          numberOfAnimalsQuantity: '40',
          animalIdentifiers: [
            { animalIdentifierIdentificationDetails: 'Tank 12, batch 7' }
          ]
        }
      ]
    }
  },
  {
    // A typed document record scopes the three presentPerRecord dependants.
    id: 'with-documents',
    answers: {
      ...submitReadySeed,
      documents: [
        {
          accompanyingDocumentType: 'ITAHC',
          accompanyingDocumentAttachmentType: 'PDF',
          accompanyingDocumentReference: 'DOC-2026-001',
          accompanyingDocumentDateOfIssue: {
            day: '01',
            month: '06',
            year: '2026'
          }
        }
      ]
    }
  }
]

// `makeScope` layers two A-side flow obligations (importType, declaration) onto
// the projected inScope set so their owning pages stay reachable under B; they
// are not B-modelled obligations, so the flow prover skips them — their page
// reachability is a runtime shim covered by the flow/E2E tests, not a model
// concern.
const A_ONLY_FLOW_OBLIGATIONS = new Set(['importType', 'declaration'])

const stripIndices = (key) => key.replace(/\[\d+\]/g, '')

// The obligation name a pathKey ends on (its leaf segment, indices stripped).
const leafName = (key) => stripIndices(key).split('.').pop()

// Skip A-only flow shims and system-populated fields — neither is presented by
// a page (`flow/dispatch.js` excludes SYSTEM_POPULATED from its coverage
// assertion for the same reason), so they carry no page-reachability concern.
const isNotPagePresented = (key) =>
  A_ONLY_FLOW_OBLIGATIONS.has(stripIndices(key)) ||
  SYSTEM_POPULATED.has(leafName(key))

/**
 * proveFlowReachability — for every seed variant × scope state, confirm each
 * in-scope obligation is presented by a page (`pageOfObligation`) AND that
 * page is reachable through the flow gates in that state (`simulateJourney`).
 * Returns the deduplicated list of problems; `[]` means every owed obligation
 * is page-reachable.
 *
 * `scopeFor` / `pagesFor` are injectable so a test can drop a page and confirm
 * the prover has teeth (the dropped page's in-scope obligations become
 * `owning-page-unreachable-in-scope`).
 *
 * @param {{ scopeFor?: (answers: object) => { inScope: Set<string> },
 *           pagesFor?: (answers: object) => string[] }} [deps]
 * @returns {Array<{ obligation: string, pageId?: string, reason: string }>}
 */
export function proveFlowReachability({
  scopeFor = makeScope,
  pagesFor = simulateJourney
} = {}) {
  const problems = new Map()
  const record = (problem) => {
    const dedupeKey = `${problem.reason}:${problem.obligation}:${problem.pageId ?? ''}`
    if (!problems.has(dedupeKey)) problems.set(dedupeKey, problem)
  }

  for (const answers of enumerateAnswerStates()) {
    const { inScope } = scopeFor(answers)
    const reachablePages = new Set(pagesFor(answers))
    for (const key of inScope) {
      if (isNotPagePresented(key)) continue
      const pageId = pageOfObligation(key)
      if (!pageId) {
        record({ obligation: key, reason: 'no-owning-page' })
        continue
      }
      if (!reachablePages.has(pageId)) {
        record({
          obligation: key,
          pageId,
          reason: 'owning-page-unreachable-in-scope'
        })
      }
    }
  }

  return [...problems.values()]
}

// Every prover input: each seed variant overlaid with each scope state.
const enumerateAnswerStates = () =>
  seedVariants().flatMap(({ answers }) =>
    enumerateScopeStates().map((state) => ({
      ...answers,
      ...withoutBlanks(state)
    }))
  )

/**
 * proveScopeCompleteness — the enumeration's own completeness check, the
 * counterpart of A's retired `no-witness-puts-in-scope` problem kind. A
 * manifest obligation that NO variant × state pair puts in scope is one the
 * flow prover silently never checks — exactly how a newly imported obligation
 * (a re-vendor of the model) would dodge `proveFlowReachability` when its
 * gate values are missing from the seeds. Returns the names of every such
 * obligation; `[]` means the enumeration reaches the whole manifest
 * (SYSTEM_POPULATED fields excepted — no page presents them).
 *
 * `scopeFor` is injectable so a test can prove the check has teeth.
 *
 * @param {{ scopeFor?: (answers: object) => { inScope: Set<string> } }} [deps]
 * @returns {string[]} manifest obligation names never seen in scope.
 */
export function proveScopeCompleteness({ scopeFor = makeScope } = {}) {
  const seen = new Set()
  for (const answers of enumerateAnswerStates()) {
    for (const key of scopeFor(answers).inScope) seen.add(leafName(key))
  }
  return obligations
    .map((obligation) => obligation.name)
    .filter((name) => !SYSTEM_POPULATED.has(name) && !seen.has(name))
}
