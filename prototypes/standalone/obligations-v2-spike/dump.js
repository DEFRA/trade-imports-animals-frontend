import { buildDispatch } from './flow/dispatch.js'
import { allFlowPages, sections, nonQuoteSections } from './flow/flow.js'
import { dispatchPages } from './features/index.js'
import { reconcile } from './engine/reconcile.js'
import {
  readyForQuote,
  sectionStatus,
  entryComplete,
  FULFILLED,
  NA
} from './engine/status.js'
import {
  drivers as driversDef,
  driverClaims as driverClaimsDef
} from './features/named-driver/obligations.js'
import { pathKey } from './lib/path.js'

/**
 * Headless state dump — the state layer without its UI. Prints, for a
 * fixture answers map, the derived scope, the wiped set, per-section
 * status and quote-readiness. No server, no rendering. Mirrors v1's
 * dump.js in spirit: interrogate the model directly.
 *
 *   node prototypes/standalone/obligations-v2-spike/dump.js
 *
 * This fixture deliberately exercises the NESTED, INDEXED, ITEM-CONDITIONAL
 * machinery (DISCUSSION-LOG entry 6) as hard as the model allows:
 *
 *   - SEVERAL named drivers — a top-level `drivers` collection with 3 entries.
 *   - EACH driver owns 0..n nested claims — a loop inside a loop (6b): one
 *     driver with zero claims, one with two, one with three.
 *   - SOME claims are windscreen, some not — item-scoped conditionality (6c):
 *     `drivers[i].claims[j].windscreenProvider` is in scope for THAT claim
 *     instance iff its own sibling `claimType === 'windscreen'`.
 *
 * Three things to watch in the output:
 *   1. `nestedScope` — the windscreen provider is in scope ONLY under the
 *      windscreen claims, at their exact deep paths, independently per item.
 *   2. `wiped` — Marcus's third claim is an accident carrying a STALE provider
 *      answer; it is out of scope, so it is destroyed at its exact path
 *      (`drivers[2].claims[2].windscreenProvider`) — field-level wipe WITHIN an
 *      item at full depth (destroyed, not hidden — the Yes-No-Yes invariant).
 *   3. `readyForQuote:false` + `whyNotReady` — the ONLY thing blocking the quote
 *      is Marcus's second claim: a windscreen with no provider yet, so that one
 *      claim is incomplete → its driver is incomplete → the named-driver section
 *      is In Progress. Per-item completeness rolls all the way up the tree.
 */
buildDispatch(dispatchPages)

// A representative mid-journey fixture (edit freely to explore). The trunk is
// complete so the nested drivers are the only thing left in play.
const answers = {
  email: 'alex@example.com',
  fullName: 'Alex Driver',
  hadClaims: 'yes',
  // Top-level claims (driving history) — first-class indexing (6a) with the SAME
  // item-scoped windscreen conditionality at depth 1, for contrast with the
  // depth-2 driver claims below.
  claims: [
    {
      claimType: 'windscreen',
      claimAmount: '150',
      windscreenProvider: 'national-windscreens'
    },
    { claimType: 'theft', claimAmount: '2000' }
  ],
  coverType: 'comprehensive',
  voluntaryExcess: 'yes',
  excessAmount: '250',
  addons: ['named-driver'],

  // The headline: a `drivers` collection (0..n) where each driver OWNS a nested
  // `claims` collection (0..n). Depth-2 tree: drivers[i].claims[j].claimType.
  drivers: [
    // Driver 0 — ZERO claims. The nested collection is optional
    // (requiredAtLeastOne omitted on driverClaims), so an empty claims array
    // still counts this driver complete.
    {
      driverName: 'Jordan Fielding',
      driverDob: '1990-05-02',
      relationship: 'spouse',
      claims: []
    },

    // Driver 1 — TWO claims, both complete. One windscreen (provider owed +
    // supplied), one accident (no provider owed). Fully independent of driver 2.
    {
      driverName: 'Priya Raman',
      driverDob: '1985-11-20',
      relationship: 'named',
      claims: [
        {
          claimType: 'windscreen',
          claimAmount: '300',
          windscreenProvider: 'autoglass'
        },
        { claimType: 'accident', claimAmount: '1200' }
      ]
    },

    // Driver 2 — THREE claims, deliberately messy:
    //   [0] windscreen + provider           → complete
    //   [1] windscreen, provider MISSING     → provider in scope but unanswered
    //                                          → this claim (and so this driver,
    //                                            and so the section) is incomplete
    //   [2] accident carrying a STALE provider → provider OUT of scope → WIPED
    {
      driverName: 'Marcus Webb',
      driverDob: '1978-03-14',
      relationship: 'child',
      claims: [
        {
          claimType: 'windscreen',
          claimAmount: '250',
          windscreenProvider: 'nationwide'
        },
        { claimType: 'windscreen', claimAmount: '400' },
        {
          claimType: 'accident',
          claimAmount: '900',
          windscreenProvider: 'autoglass'
        }
      ]
    }
  ]
}

const { inScope, wiped } = reconcile(answers)

/** Per-driver, per-claim readout — the nested engine facts made legible. */
const driversBreakdown = (answers.drivers ?? []).map((driver, d) => ({
  driver: driver.driverName,
  relationship: driver.relationship,
  claimCount: (driver.claims ?? []).length,
  complete: entryComplete(driversDef, driver),
  claims: (driver.claims ?? []).map((claim, c) => {
    const providerPath = pathKey([
      'drivers',
      d,
      'claims',
      c,
      'windscreenProvider'
    ])
    return {
      path: pathKey(['drivers', d, 'claims', c]),
      claimType: claim.claimType,
      claimAmount: claim.claimAmount,
      windscreenProvider: claim.windscreenProvider ?? null,
      providerInScope: inScope.has(providerPath),
      complete: entryComplete(driverClaimsDef, claim)
    }
  })
}))

/** Which non-quote sections are not yet Fulfilled/NA — i.e. what blocks the quote. */
const whyNotReady = nonQuoteSections
  .map((s) => ({ section: s.id, status: sectionStatus(s, answers, inScope) }))
  .filter(({ status }) => status !== FULFILLED && status !== NA)

console.log(
  JSON.stringify(
    {
      answers,
      driversBreakdown,
      // Just the drivers subtree of scope, so the nested paths read clearly.
      nestedScope: [...inScope].filter((k) => k.startsWith('drivers')).sort(),
      wiped,
      readyForQuote: readyForQuote(answers, inScope),
      whyNotReady,
      sectionStatus: Object.fromEntries(
        sections.map((s) => [s.id, sectionStatus(s, answers, inScope)])
      ),
      inScope: [...inScope].sort(),
      pageCount: allFlowPages.length
    },
    null,
    2
  )
)
