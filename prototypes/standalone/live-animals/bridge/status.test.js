import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { buildDispatch } from '../flow/dispatch.js'
import { makeScope } from '../engine/index.js'
import { configureReadyForCheckYourAnswers } from '../engine/read.js'
import { rowParts, taskRows } from '../flow/task-rows.js'
import {
  readyForCheckYourAnswers,
  sectionObligationIds
} from '../flow/section-status.js'
import { answerSections } from '../flow/flow.js'
import {
  statusOf,
  NA,
  NOT_STARTED,
  IN_PROGRESS,
  FULFILLED,
  OPTIONAL
} from './status.js'

// The presentation rollup (statusOf), pinned against the manifest. The expected
// statuses below are stated as literals so a regression fails loudly. The
// concrete single-row walk (Not started → In progress → Completed) lives in
// flow/task-rows.test.js; this file pins the whole row / section / readiness
// rollup across representative journey states.

const { values: happyPath } = JSON.parse(
  readFileSync(new URL('../spec/fixtures/happy-path.json', import.meta.url))
)

// Row order is taskRows order; section order is answerSections order.
const cases = {
  'a blank journey': {
    answers: {},
    rows: [
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      OPTIONAL
    ],
    sections: [
      OPTIONAL,
      NOT_STARTED,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      OPTIONAL,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED
    ],
    ready: false
  },
  'an origin-only journey': {
    answers: { countryOfOrigin: 'FR' },
    rows: [
      IN_PROGRESS,
      NOT_STARTED,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      OPTIONAL
    ],
    sections: [
      OPTIONAL,
      IN_PROGRESS,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      OPTIONAL,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED
    ],
    ready: false
  },
  'a partial single-line journey': {
    answers: {
      countryOfOrigin: 'FR',
      commodityLines: [{ commoditySelection: 'Cow' }]
    },
    rows: [
      IN_PROGRESS,
      IN_PROGRESS,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      OPTIONAL
    ],
    sections: [
      OPTIONAL,
      IN_PROGRESS,
      IN_PROGRESS,
      NA,
      NOT_STARTED,
      OPTIONAL,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED
    ],
    ready: false
  },
  'a line with data but no identifiers': {
    answers: {
      countryOfOrigin: 'FR',
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          numberOfAnimalsQuantity: '25'
        }
      ]
    },
    rows: [
      IN_PROGRESS,
      FULFILLED,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      OPTIONAL
    ],
    sections: [
      OPTIONAL,
      IN_PROGRESS,
      IN_PROGRESS,
      NA,
      NOT_STARTED,
      OPTIONAL,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED
    ],
    ready: false
  },
  'the happy path': {
    answers: happyPath,
    rows: [
      FULFILLED,
      FULFILLED,
      FULFILLED,
      NA,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED
    ],
    sections: [
      FULFILLED,
      FULFILLED,
      FULFILLED,
      NA,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED
    ],
    ready: true
  },
  'the happy path with an empty required collection': {
    answers: { ...happyPath, commodityLines: [] },
    rows: [
      FULFILLED,
      NOT_STARTED,
      FULFILLED,
      NA,
      FULFILLED,
      NOT_STARTED,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED
    ],
    sections: [
      FULFILLED,
      FULFILLED,
      NOT_STARTED,
      NA,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED,
      FULFILLED
    ],
    ready: false
  }
}

describe('statusOf — the presentation rollup', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })

  describe.each(Object.entries(cases))(
    '%s',
    (_label, { answers, rows, sections, ready }) => {
      const scope = () => makeScope(answers).inScope

      it('rolls each task row up to the expected status', () => {
        const inScope = scope()
        expect(
          taskRows.map((row) => statusOf(rowParts(row), answers, inScope))
        ).toEqual(rows)
      })

      it('rolls each answer section up to the expected status', () => {
        const inScope = scope()
        expect(
          answerSections.map((section) =>
            statusOf(sectionObligationIds(section), answers, inScope)
          )
        ).toEqual(sections)
      })

      it('derives readiness for check-your-answers', () => {
        expect(readyForCheckYourAnswers(answers, scope())).toBe(ready)
      })
    }
  )
})

describe('statusOf — the commodities/identification facet split', () => {
  const inScope = new Set(['commodityLines'])
  const exceptIdentifiers = {
    collection: 'commodityLines',
    except: ['animalIdentifiers']
  }
  const onlyIdentifiers = {
    collection: 'commodityLines',
    only: ['animalIdentifiers']
  }

  // [answers, exceptIdentifiers status, onlyIdentifiers status]
  const facetCases = [
    [{}, NOT_STARTED, NOT_STARTED],
    [
      { commodityLines: [{ commoditySelection: 'Cow' }] },
      IN_PROGRESS,
      NOT_STARTED
    ],
    [
      {
        commodityLines: [
          {
            commoditySelection: 'Cow',
            speciesSelection: '1148346',
            numberOfAnimalsQuantity: '25'
          }
        ]
      },
      FULFILLED,
      NOT_STARTED
    ],
    [
      {
        commodityLines: [
          {
            commoditySelection: 'Cow',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
          }
        ]
      },
      IN_PROGRESS,
      FULFILLED
    ],
    // A unit that EXISTS (permanentAddress stored, Cat-scoped) but violates
    // the at-least-one-identifier invariant — the per-record verdict the
    // engine's groupInvariantErrors supplies.
    [
      {
        commodityLines: [
          {
            commoditySelection: 'Cat',
            animalIdentifiers: [
              {
                permanentAddress: {
                  name: 'Owner',
                  addressLine1: '1 Farm Lane',
                  town: 'Yorkton',
                  postcode: 'YO1 1AA',
                  country: 'United Kingdom',
                  telephone: '01000 000000',
                  email: 'owner@example.test'
                }
              }
            ]
          }
        ]
      },
      IN_PROGRESS,
      IN_PROGRESS
    ]
  ]

  it('classifies each facet as B derives it', () => {
    for (const [answers, exceptStatus, onlyStatus] of facetCases) {
      expect(statusOf([exceptIdentifiers], answers, inScope)).toBe(exceptStatus)
      expect(statusOf([onlyIdentifiers], answers, inScope)).toBe(onlyStatus)
    }
  })
})

describe('statusOf — the recordCountEquals invariant in isolation', () => {
  const inScope = new Set(['commodityLines'])
  const onlyIdentifiers = {
    collection: 'commodityLines',
    only: ['animalIdentifiers']
  }

  const lineWith = (quantity) => ({
    commodityLines: [
      {
        commoditySelection: 'Cow',
        speciesSelection: '1148346',
        numberOfAnimalsQuantity: quantity,
        animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
      }
    ]
  })

  it('blocks the identifiers facet while the unit count trails the declared quantity', () => {
    // One complete unit satisfies the any-of rule, so the count
    // mismatch is the only outstanding concern.
    expect(statusOf([onlyIdentifiers], lineWith('2'), inScope)).toBe(
      IN_PROGRESS
    )
  })

  it('fulfils the identifiers facet when the unit count matches the declared quantity', () => {
    expect(statusOf([onlyIdentifiers], lineWith('1'), inScope)).toBe(FULFILLED)
  })
})

describe('statusOf — the documents MAX_ENTRIES cap', () => {
  const inScope = new Set(['documents'])

  const completeDocuments = (count) => ({
    documents: Array.from({ length: count }, (_, index) => ({
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentAttachmentType: 'PDF',
      accompanyingDocumentReference: `DOC-${index + 1}`,
      accompanyingDocumentDateOfIssue: { day: '01', month: '06', year: '2026' }
    }))
  })

  it('fulfils the documents part at the cap', () => {
    expect(statusOf(['documents'], completeDocuments(10), inScope)).toBe(
      FULFILLED
    )
  })

  it('blocks the documents part beyond the cap', () => {
    expect(statusOf(['documents'], completeDocuments(11), inScope)).toBe(
      IN_PROGRESS
    )
  })
})
