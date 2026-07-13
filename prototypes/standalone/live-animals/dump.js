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

buildDispatch(dispatchPages)

const answers = {
  commodityLines: [
    {
      commoditySelection: 'Cow',
      typeSelection: 'Domestic',
      speciesSelection: ['1148346'],
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25'
    },

    {
      commoditySelection: 'Cow',
      typeSelection: 'Domestic',
      speciesSelection: ['1148346'],
      numberOfAnimalsQuantity: '9'
    },

    {
      commoditySelection: 'Fish',
      typeSelection: 'Domestic',
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
