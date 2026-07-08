import { buildDispatch } from './flow/dispatch.js'
import { allFlowPages, sections, nonQuoteSections } from './flow/flow.js'
import { dispatchPages } from './features/index.js'
import { reconcile } from './engine/evaluate/reconcile.js'
import { FULFILLED, NA } from './engine/status.js'
import { entryComplete } from './engine/evaluate/complete.js'
import { readyForQuote, sectionStatus } from './flow/section-status.js'
import {
  drivers as driversObligation,
  driverClaims as driverClaimsObligation
} from './features/named-driver/obligations.js'
import { pathKey } from './lib/path.js'

// Headless state dump — run: node prototypes/standalone/live-animals/dump.js
buildDispatch(dispatchPages)

const answers = {
  hadClaims: 'yes',
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

  drivers: [
    {
      driverName: 'Jordan Fielding',
      driverDob: '1990-05-02',
      relationship: 'spouse',
      claims: []
    },

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

    // Deliberately messy — do not tidy: claim [1] is a windscreen with the
    // provider missing (drives readyForQuote:false); claim [2] is an accident
    // carrying a STALE provider (drives the wipe demo).
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

const driversBreakdown = (answers.drivers ?? []).map((driver, driverIndex) => ({
  driver: driver.driverName,
  relationship: driver.relationship,
  claimCount: (driver.claims ?? []).length,
  complete: entryComplete(driversObligation, driver),
  claims: (driver.claims ?? []).map((claim, claimIndex) => {
    const providerPath = pathKey([
      'drivers',
      driverIndex,
      'claims',
      claimIndex,
      'windscreenProvider'
    ])
    return {
      path: pathKey(['drivers', driverIndex, 'claims', claimIndex]),
      claimType: claim.claimType,
      claimAmount: claim.claimAmount,
      windscreenProvider: claim.windscreenProvider ?? null,
      providerInScope: inScope.has(providerPath),
      complete: entryComplete(driverClaimsObligation, claim)
    }
  })
}))

const whyNotReady = nonQuoteSections
  .map((section) => ({
    section: section.id,
    status: sectionStatus(section, answers, inScope)
  }))
  .filter(({ status }) => status !== FULFILLED && status !== NA)

console.log(
  JSON.stringify(
    {
      answers,
      driversBreakdown,
      nestedScope: [...inScope]
        .filter((key) => key.startsWith('drivers'))
        .sort(),
      wiped,
      readyForQuote: readyForQuote(answers, inScope),
      whyNotReady,
      sectionStatus: Object.fromEntries(
        sections.map((section) => [
          section.id,
          sectionStatus(section, answers, inScope)
        ])
      ),
      inScope: [...inScope].sort(),
      pageCount: allFlowPages.length
    },
    null,
    2
  )
)
