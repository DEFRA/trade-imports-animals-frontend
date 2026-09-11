import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
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

// The presentation rollup (statusOf), pinned against the manifest. The expected
// statuses below are stated as literals so a regression fails loudly. The
// concrete single-row walk (Not started → In progress → Completed) lives in
// flow/task-rows.test.js; this file pins the whole row / section / readiness
// rollup across representative journey states.

const { values: happyPath } = JSON.parse(
  readFileSync(new URL('./fixtures/happy-path.json', import.meta.url))
)

// Row order is taskRows order; section order is answerSections order.
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
  // The identification row reads Completed from the first line onwards: a
  // consignment of one identified species is asked for no identifier at all,
  // so the row owes nothing even before anything is entered on it.
  'a partial single-line journey': {
    answers: {
      countryOfOrigin: 'FR',
      commodityLines: [{ commoditySelection: 'Cow' }]
    },
    rows: [
      IN_PROGRESS,
      IN_PROGRESS,
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
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          commodityType: '16',
          numberOfAnimalsQuantity: '25'
        }
      ]
    },
    rows: [
      IN_PROGRESS,
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
    buildDispatch(dispatchPages)
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

  // [answers, exceptIdentifiers status, onlyIdentifiers status]
  // A consignment of ONE identified commodity line owes no identifier at all,
  // so the identifiers facet reads Completed from the first line onwards. A
  // second identified commodity line is what turns it back into outstanding
  // work.
  const facetCases = [
    [{}, NOT_STARTED, NOT_STARTED],
    [
      { commodityLines: [{ commoditySelection: 'Cow' }] },
      IN_PROGRESS,
      FULFILLED
    ],
    [
      {
        commodityLines: [
          {
            commoditySelection: 'Cow',
            speciesSelection: '1148346',
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
          { commoditySelection: 'Cow' },
          { commoditySelection: 'Horse' }
        ]
      },
      IN_PROGRESS,
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
    // model's groupInvariantErrors supplies.
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

  it('Should classify each facet as B derives it', () => {
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
    commoditySelection: 'Cow',
    speciesSelection: '1148346',
    numberOfAnimalsQuantity: quantity,
    animalIdentifiers: identifiers
  })

  const earTag = { animalIdentifierEarTag: 'UK123456789012' }

  const facetStatus = (answers) =>
    statusOf([onlyIdentifiers], answers, inScope, evaluateAnswers(answers))

  it('Should fulfil the identifiers facet on one species however many animals it declares', () => {
    // Two hundred salmon, or two hundred cattle, need not be entered one
    // record at a time — the declared quantity is progress, not a gate.
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
          { commoditySelection: 'Horse' }
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
            commoditySelection: 'Horse',
            numberOfAnimalsQuantity: '4',
            animalIdentifiers: [{ horseName: 'Shergar' }]
          }
        ]
      })
    ).toBe(FULFILLED)
  })

  it('Should ask no record of a second species that carries no identifier of its own', () => {
    // Fish is on none of the identifier allowlists, so a Cow-and-Fish
    // consignment is a one-identified-species consignment.
    expect(
      facetStatus({
        commodityLines: [cowLine('5', []), { commoditySelection: 'Fish' }]
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
