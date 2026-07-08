import { buildDispatch } from './flow/dispatch.js'
import { allFlowPages, sections, answerSections } from './flow/flow.js'
import { dispatchPages } from './features/index.js'
import { reconcile } from './engine/evaluate/reconcile.js'
import { FULFILLED, NA } from './engine/status.js'
import { entryComplete } from './engine/evaluate/complete.js'
import {
  readyForCheckYourAnswers,
  sectionStatus
} from './flow/section-status.js'
import { commodityLines as commodityLinesObligation } from './features/commodities/obligations.js'
import { pathKey } from './lib/path.js'

// Headless state dump — run: node prototypes/standalone/live-animals/dump.js
buildDispatch(dispatchPages)

const answers = {
  commodityLines: [
    // Cattle is on the package-count list, so numberOfPackages is IN scope.
    {
      commoditySelection: '0102 - Cattle',
      typeSelection: 'domestic',
      speciesSelection: ['bos-taurus'],
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25'
    },

    // Cattle again, but numberOfPackages is MISSING — an optional item field,
    // so its absence does not gate the line's completeness.
    {
      commoditySelection: '0102 - Cattle',
      typeSelection: 'domestic',
      speciesSelection: ['bos-taurus'],
      numberOfAnimalsQuantity: '9'
    },

    // Deliberately messy — do not tidy: Fish is NOT on the package-count list,
    // so numberOfPackages is out of scope for this line; the STALE value drives
    // the wipe demo (field-level destruction inside a collection item).
    {
      commoditySelection: '0301 - Fish',
      typeSelection: 'domestic',
      speciesSelection: ['salmo-salar'],
      numberOfPackages: '7',
      numberOfAnimalsQuantity: '40'
    }
  ]
}

const { inScope, wiped } = reconcile(answers)

const commoditiesBreakdown = (answers.commodityLines ?? []).map(
  (line, lineIndex) => {
    const packagesPath = pathKey([
      'commodityLines',
      lineIndex,
      'numberOfPackages'
    ])
    return {
      path: pathKey(['commodityLines', lineIndex]),
      commodity: line.commoditySelection,
      numberOfPackages: line.numberOfPackages ?? null,
      packagesInScope: inScope.has(packagesPath),
      complete: entryComplete(commodityLinesObligation, line)
    }
  }
)

const whyNotReady = answerSections
  .map((section) => ({
    section: section.id,
    status: sectionStatus(section, answers, inScope)
  }))
  .filter(({ status }) => status !== FULFILLED && status !== NA)

console.log(
  JSON.stringify(
    {
      answers,
      commoditiesBreakdown,
      indexedScope: [...inScope]
        .filter((key) => key.startsWith('commodityLines'))
        .sort(),
      wiped,
      readyForCheckYourAnswers: readyForCheckYourAnswers(answers, inScope),
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
