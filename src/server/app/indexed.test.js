import { SET_ID } from './sets/live-animals/set.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeScope } from './engine/index.js'
import {
  completeCommodityLine,
  completeNotification
} from './engine/test-support.js'
import { evaluateAnswers } from './bridge/evaluation.js'
import { FULFILLED, IN_PROGRESS, OPTIONAL } from './bridge/status/index.js'
import {
  readyForCheckYourAnswers,
  sectionStatus
} from './flow/section-status.js'
import { sections } from './sets/live-animals/journeys/linear/flow/flow.js'
import { walkObligations } from './bridge/obligation-source.js'
import { buildDispatch } from './flow/dispatch.js'
import { dispatchPages } from './sets/live-animals/journeys/linear/features/index.js'

const commoditiesSection = sections.find(
  (section) => section.id === 'commodities'
)
const documentsSection = sections.find((section) => section.id === 'documents')

const completeDocument = {
  accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE',
  accompanyingDocumentAttachmentType: 'upload',
  accompanyingDocumentReference: 'VC-2026-01',
  accompanyingDocumentDateOfIssue: { day: '1', month: '2', year: '2026' }
}

const notificationWithoutDocuments = () => {
  const notification = completeNotification()
  delete notification.documents
  return notification
}

const isReady = (answers) =>
  readyForCheckYourAnswers(
    answers,
    makeScope(answers).inScope,
    evaluateAnswers(answers)
  )

describe('indexed obligations are first-class', () => {
  beforeAll(() => {
    buildDispatch(SET_ID, dispatchPages)
  })

  it('Should enumerate sub-obligations at every depth via walkObligations', () => {
    const addresses = [...walkObligations()].map((node) => node.templatePath)
    expect(addresses).toContain('commodityLines')
    expect(addresses).toContain('commodityLines.commodityCode')
    expect(addresses).toContain('commodityLines.numberOfAnimalsQuantity')
    expect(addresses).toContain(
      'commodityLines.animalIdentifiers.animalIdentifierEarTag'
    )
  })

  it('Should scope each stored commodity line instance path when the collection is in scope', () => {
    const { inScope } = makeScope({
      commodityLines: [
        { commodityCode: '0102', numberOfAnimalsQuantity: '25' },
        { commodityCode: '010420', numberOfAnimalsQuantity: '9' }
      ]
    })
    expect(inScope.has('commodityLines')).toBe(true)
    expect(inScope.has('commodityLines[0].commodityCode')).toBe(true)
    expect(inScope.has('commodityLines[0].numberOfAnimalsQuantity')).toBe(true)
    expect(inScope.has('commodityLines[1].commodityCode')).toBe(true)
    expect(inScope.has('commodityLines[1].numberOfAnimalsQuantity')).toBe(true)
  })

  it('Should treat a commodity line with a blank required sub-field as incomplete (per-item completeness)', () => {
    const complete = notificationWithoutDocuments()
    const incomplete = {
      ...complete,
      commodityLines: [{ commodityCode: '0102' }]
    }
    expect(isReady(complete)).toBe(true)
    expect(isReady(incomplete)).toBe(false)
  })

  it('Should read an untouched optional section as OPTIONAL (not Completed, does not count)', () => {
    const answers = {}
    expect(
      sectionStatus(
        documentsSection,
        answers,
        makeScope(answers).inScope,
        evaluateAnswers(answers)
      )
    ).toBe(OPTIONAL)

    const withoutDocuments = notificationWithoutDocuments()
    expect(
      sectionStatus(
        documentsSection,
        withoutDocuments,
        makeScope(withoutDocuments).inScope,
        evaluateAnswers(withoutDocuments)
      )
    ).toBe(OPTIONAL)
    expect(isReady(withoutDocuments)).toBe(true)
  })

  it('Should read an optional section with an incomplete entry as IN_PROGRESS', () => {
    const answers = {
      documents: [{ accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE' }]
    }
    expect(
      sectionStatus(
        documentsSection,
        answers,
        makeScope(answers).inScope,
        evaluateAnswers(answers)
      )
    ).toBe(IN_PROGRESS)
  })

  it('Should read an optional section with a complete entry as FULFILLED', () => {
    const answers = { documents: [completeDocument] }
    expect(
      sectionStatus(
        documentsSection,
        answers,
        makeScope(answers).inScope,
        evaluateAnswers(answers)
      )
    ).toBe(FULFILLED)
  })

  it('Should roll per-item completeness into the commodities section status', () => {
    const withIncompleteLine = {
      commodityLines: [{ commodityCode: '0102' }]
    }
    const withCompleteLine = {
      commodityLines: [completeCommodityLine()]
    }
    expect(
      sectionStatus(
        commoditiesSection,
        withIncompleteLine,
        makeScope(withIncompleteLine).inScope,
        evaluateAnswers(withIncompleteLine)
      )
    ).toBe(IN_PROGRESS)
    expect(
      sectionStatus(
        commoditiesSection,
        withCompleteLine,
        makeScope(withCompleteLine).inScope,
        evaluateAnswers(withCompleteLine)
      )
    ).toBe(FULFILLED)
  })
})
