import { buildDispatch } from './flow/dispatch.js'
import { allFlowPages, sections } from './flow/flow.js'
import { dispatchPages } from './features/index.js'
import { reconcile } from './engine/reconcile.js'
import { readyForQuote, sectionStatus } from './engine/status.js'

/**
 * Headless state dump — the state layer without its UI. Prints, for a
 * fixture answers map, the derived scope, the wiped set, per-section
 * status and quote-readiness. No server, no rendering. Mirrors v1's
 * dump.js in spirit: interrogate the model directly.
 *
 *   node prototypes/standalone/obligations-v2-spike/dump.js
 */
buildDispatch(dispatchPages)

// A representative mid-journey fixture (edit freely to explore).
const answers = {
  email: 'alex@example.com',
  fullName: 'Alex Driver',
  hadClaims: 'yes',
  claims: [{ claimType: 'accident', claimAmount: '500' }],
  coverType: 'comprehensive',
  voluntaryExcess: 'yes',
  excessAmount: '250',
  addons: ['named-driver'],
  driverName: 'Sam Passenger',
  relationship: 'spouse'
}

const { inScope, wiped } = reconcile(answers)

console.log(
  JSON.stringify(
    {
      answers,
      inScope: [...inScope].sort(),
      wiped,
      readyForQuote: readyForQuote(answers, inScope),
      sectionStatus: Object.fromEntries(
        sections.map((s) => [s.id, sectionStatus(s, answers, inScope)])
      ),
      pageCount: allFlowPages.length
    },
    null,
    2
  )
)
