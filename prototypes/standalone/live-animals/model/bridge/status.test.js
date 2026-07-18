import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../../features/index.js'
import { buildDispatch } from '../../flow/dispatch.js'
import { reconcile } from '../../engine/evaluate/reconcile.js'
import { rowParts, taskRows } from '../../flow/task-rows.js'
import {
  readyForCheckYourAnswers,
  sectionObligationIds
} from '../../flow/section-status.js'
import { answerSections } from '../../flow/flow.js'
import { statusOf, FULFILLED, NA, OPTIONAL } from '../../engine/status.js'
import { statusOfFromB } from './status.js'

// The oracle proves A/B scope + status agree; this pins the presentation-facing
// rollup: the B-sourced row / section / readiness derivations (`statusOfFromB`)
// return exactly what A's `statusOf` returns for the same (answers, inScope).

const { values: happyPath } = JSON.parse(
  readFileSync(new URL('../../spec/fixtures/happy-path.json', import.meta.url))
)

const states = {
  'a blank journey': {},
  'an origin-only journey': { countryOfOrigin: 'FR' },
  'a partial single-line journey': {
    countryOfOrigin: 'FR',
    commodityLines: [{ commoditySelection: 'Cow' }]
  },
  'a line with data but no identifiers': {
    countryOfOrigin: 'FR',
    commodityLines: [
      {
        commoditySelection: 'Cow',
        speciesSelection: '1148346',
        numberOfAnimalsQuantity: '25'
      }
    ]
  },
  'the happy path': happyPath,
  'the happy path with an empty required collection': {
    ...happyPath,
    commodityLines: []
  }
}

describe('statusOfFromB — the B-derived rollup agrees with A', () => {
  beforeAll(() => buildDispatch(dispatchPages))

  const isReady = (statusFn, answers, inScope) =>
    taskRows.every((row) => {
      const status = statusFn(rowParts(row), answers, inScope)
      return status === FULFILLED || status === NA || status === OPTIONAL
    })

  describe.each(Object.entries(states))('%s', (_label, answers) => {
    const { inScope } = reconcile(answers)

    it('Should match A row-for-row', () => {
      for (const row of taskRows) {
        const a = statusOf(rowParts(row), answers, inScope)
        const b = statusOfFromB(rowParts(row), answers, inScope)
        expect(b, `row ${row.id}`).toBe(a)
      }
    })

    it('Should match A section-for-section', () => {
      for (const section of answerSections) {
        const a = statusOf(sectionObligationIds(section), answers, inScope)
        const b = statusOfFromB(sectionObligationIds(section), answers, inScope)
        expect(b, `section ${section.id}`).toBe(a)
      }
    })

    it('Should match A readiness', () => {
      const a = isReady(statusOf, answers, inScope)
      const b = readyForCheckYourAnswers(answers, inScope)
      expect(b).toBe(a)
    })
  })
})

describe('statusOfFromB — the commodities/identification facet split', () => {
  const inScope = new Set(['commodityLines'])
  const exceptIdentifiers = {
    collection: 'commodityLines',
    except: ['animalIdentifiers']
  }
  const onlyIdentifiers = {
    collection: 'commodityLines',
    only: ['animalIdentifiers']
  }

  const facetStates = [
    {},
    { commodityLines: [{ commoditySelection: 'Cow' }] },
    {
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          numberOfAnimalsQuantity: '25'
        }
      ]
    },
    {
      commodityLines: [
        {
          commoditySelection: 'Cow',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
        }
      ]
    }
  ]

  it('Should classify each facet exactly as A does', () => {
    for (const answers of facetStates) {
      for (const facet of [exceptIdentifiers, onlyIdentifiers]) {
        expect(statusOfFromB([facet], answers, inScope)).toBe(
          statusOf([facet], answers, inScope)
        )
      }
    }
  })
})
