import { SET_ID } from '../../../set.js'
import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { completeNotification } from '../../../../../engine/test-support.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { makeScopeFromEvaluation } from '../../../../../bridge/scope.js'
import { evaluateAnswers } from '../../../../../bridge/evaluation.js'
import { rowParts, taskRows } from './task-rows.js'
import {
  readyForCheckYourAnswers,
  sectionObligationIds
} from '../../../../../flow/section-status.js'
import { answerSections } from './flow.js'
import {
  statusOf,
  NA,
  NOT_STARTED,
  IN_PROGRESS,
  FULFILLED,
  OPTIONAL
} from '../../../../../bridge/status/index.js'
import {
  BOS_TAURUS_ROW,
  EQUUS_CABALUS_ROW,
  FELIS_CATUS_ROW,
  STRUTHIO_ROW
} from '../features/commodities/search/test-support.js'

const happyPath = completeNotification()

const cases = {
  'a blank journey': {
    answers: {},
    rows: [
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
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
      NA,
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
      NOT_STARTED,
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
      NA,
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
  'a partial single-line journey with identifiers fulfilled with no records': {
    answers: {
      countryOfOrigin: 'FR',
      commodityLines: [{ commodityCode: BOS_TAURUS_ROW.commodityCode }]
    },
    rows: [
      IN_PROGRESS,
      IN_PROGRESS,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      FULFILLED,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      OPTIONAL
    ],
    sections: [
      NA,
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
          ...BOS_TAURUS_ROW,
          commodityType: '16',
          numberOfAnimalsQuantity: '25'
        }
      ]
    },
    rows: [
      IN_PROGRESS,
      FULFILLED,
      FULFILLED,
      NOT_STARTED,
      NOT_STARTED,
      FULFILLED,
      NOT_STARTED,
      NA,
      NOT_STARTED,
      NOT_STARTED,
      NOT_STARTED,
      OPTIONAL
    ],
    sections: [
      NA,
      IN_PROGRESS,
      FULFILLED,
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
      FULFILLED,
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
      NA,
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
      NOT_STARTED,
      FULFILLED,
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
      NA,
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
    buildDispatch(SET_ID, dispatchPages)
  })

  describe.each(Object.entries(cases))(
    '%s',
    (_label, { answers, rows, sections, ready }) => {
      const requestState = () => {
        const evaluation = evaluateAnswers(answers)
        const inScope = makeScopeFromEvaluation(evaluation, answers).inScope
        return { evaluation, inScope }
      }

      it('Should roll each task row up to the expected status', () => {
        const { evaluation, inScope } = requestState()
        expect(
          taskRows.map((row) =>
            statusOf(rowParts(row), answers, inScope, evaluation)
          )
        ).toEqual(rows)
      })

      it('Should roll each answer section up to the expected status', () => {
        const { evaluation, inScope } = requestState()
        expect(
          answerSections.map((section) =>
            statusOf(
              sectionObligationIds(section),
              answers,
              inScope,
              evaluation
            )
          )
        ).toEqual(sections)
      })

      it('Should derive readiness for check-your-answers', () => {
        const { evaluation, inScope } = requestState()
        expect(readyForCheckYourAnswers(answers, inScope, evaluation)).toBe(
          ready
        )
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

  const facetCases = [
    [{}, NOT_STARTED, NOT_STARTED],
    [
      { commodityLines: [{ commodityCode: BOS_TAURUS_ROW.commodityCode }] },
      IN_PROGRESS,
      FULFILLED
    ],
    [
      {
        commodityLines: [
          {
            ...BOS_TAURUS_ROW,
            commodityType: '16',
            numberOfAnimalsQuantity: '25'
          }
        ]
      },
      FULFILLED,
      FULFILLED
    ],
    [
      {
        commodityLines: [
          { commodityCode: BOS_TAURUS_ROW.commodityCode },
          { commodityCode: EQUUS_CABALUS_ROW.commodityCode }
        ]
      },
      IN_PROGRESS,
      NOT_STARTED
    ],
    [
      {
        commodityLines: [
          {
            commodityCode: BOS_TAURUS_ROW.commodityCode,
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
          }
        ]
      },
      IN_PROGRESS,
      FULFILLED
    ],
    [
      {
        commodityLines: [
          {
            ...FELIS_CATUS_ROW,
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

  it('Should give the commodity facet and the identifiers facet the expected status for each answer set', () => {
    for (const [answers, exceptStatus, onlyStatus] of facetCases) {
      const evaluation = evaluateAnswers(answers)
      expect(statusOf([exceptIdentifiers], answers, inScope, evaluation)).toBe(
        exceptStatus
      )
      expect(statusOf([onlyIdentifiers], answers, inScope, evaluation)).toBe(
        onlyStatus
      )
    }
  })
})

describe('statusOf — the multi-species identifier floor in isolation', () => {
  const inScope = new Set(['commodityLines'])
  const onlyIdentifiers = {
    collection: 'commodityLines',
    only: ['animalIdentifiers']
  }

  const cowLine = (quantity, identifiers) => ({
    ...BOS_TAURUS_ROW,
    numberOfAnimalsQuantity: quantity,
    animalIdentifiers: identifiers
  })

  const earTag = { animalIdentifierEarTag: 'UK123456789012' }

  const facetStatus = (answers) =>
    statusOf([onlyIdentifiers], answers, inScope, evaluateAnswers(answers))

  it('Should fulfil the identifiers facet on one species however many animals it declares', () => {
    expect(facetStatus({ commodityLines: [cowLine('200', [earTag])] })).toBe(
      FULFILLED
    )
  })

  it('Should fulfil the identifiers facet on one species carrying no identifier at all', () => {
    expect(facetStatus({ commodityLines: [cowLine('5', [])] })).toBe(FULFILLED)
  })

  it('Should block the identifiers facet while a second identified species carries no record', () => {
    expect(
      facetStatus({
        commodityLines: [
          cowLine('5', [earTag]),
          { commodityCode: EQUUS_CABALUS_ROW.commodityCode }
        ]
      })
    ).toBe(IN_PROGRESS)
  })

  it('Should fulfil the identifiers facet on one record per identified species', () => {
    expect(
      facetStatus({
        commodityLines: [
          cowLine('5', [earTag]),
          {
            ...EQUUS_CABALUS_ROW,
            numberOfAnimalsQuantity: '4',
            animalIdentifiers: [{ horseName: 'Shergar' }]
          }
        ]
      })
    ).toBe(FULFILLED)
  })

  it('Should ask no record of a second species that carries no identifier of its own', () => {
    expect(
      facetStatus({
        commodityLines: [
          cowLine('5', []),
          { commodityCode: STRUTHIO_ROW.commodityCode }
        ]
      })
    ).toBe(FULFILLED)
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

  it('Should fulfil the documents part at the cap', () => {
    const answers = completeDocuments(15)
    expect(
      statusOf(['documents'], answers, inScope, evaluateAnswers(answers))
    ).toBe(FULFILLED)
  })

  it('Should block the documents part beyond the cap', () => {
    const answers = completeDocuments(16)
    expect(
      statusOf(['documents'], answers, inScope, evaluateAnswers(answers))
    ).toBe(IN_PROGRESS)
  })
})

describe('statusOf — optional documents', () => {
  it('Should keep a complete journey ready when no document has been started', () => {
    const answers = structuredClone(happyPath)
    delete answers.documents
    const evaluation = evaluateAnswers(answers)
    const inScope = makeScopeFromEvaluation(evaluation, answers).inScope

    expect(statusOf(['documents'], answers, inScope, evaluation)).toBe(OPTIONAL)
    expect(readyForCheckYourAnswers(answers, inScope, evaluation)).toBe(true)
  })
})
