import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../../features/index.js'
import { buildDispatch } from '../../flow/dispatch.js'
import { reconcile } from '../../engine/evaluate/reconcile.js'
import { rowStatus, taskRows } from '../../flow/task-rows.js'
import {
  readyForCheckYourAnswers,
  sectionStatus
} from '../../flow/section-status.js'
import { answerSections } from '../../flow/flow.js'
import { statusOf } from '../../engine/status.js'
import { statusOfFromB } from './status.js'

// The oracle proves A/B scope + status agree; this pins the presentation-facing
// rollup: under MODEL=b the row / section / readiness derivations (all now
// B-sourced via `statusOfFromB`) return exactly what A's `statusOf` returns for
// the same (answers, inScope). Env hygiene: MODEL is flipped per call and always
// restored, so the flag never leaks into a reused worker.
const underModel = (model, run) => {
  const saved = process.env.MODEL
  process.env.MODEL = model
  try {
    return run()
  } finally {
    if (saved === undefined) delete process.env.MODEL
    else process.env.MODEL = saved
  }
}

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

  describe.each(Object.entries(states))('%s', (_label, answers) => {
    const { inScope } = reconcile(answers)

    it('Should match A row-for-row under MODEL=b', () => {
      for (const row of taskRows) {
        const a = underModel('a', () => rowStatus(row, answers, inScope))
        const b = underModel('b', () => rowStatus(row, answers, inScope))
        expect(b, `row ${row.id}`).toBe(a)
      }
    })

    it('Should match A section-for-section under MODEL=b', () => {
      for (const section of answerSections) {
        const a = underModel('a', () =>
          sectionStatus(section, answers, inScope)
        )
        const b = underModel('b', () =>
          sectionStatus(section, answers, inScope)
        )
        expect(b, `section ${section.id}`).toBe(a)
      }
    })

    it('Should match A readiness under MODEL=b', () => {
      const a = underModel('a', () =>
        readyForCheckYourAnswers(answers, inScope)
      )
      const b = underModel('b', () =>
        readyForCheckYourAnswers(answers, inScope)
      )
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
