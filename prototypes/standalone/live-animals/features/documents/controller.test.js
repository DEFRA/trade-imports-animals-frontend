import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import { driveHandler, postHandlerOf } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as documents from './controller.js'

const post = postHandlerOf(documents)
const get = documents.routes.find(
  (route) => route.method === 'GET' && !route.path.includes('remove')
).handler

const validDocument = {
  accompanyingDocumentType: 'ITAHC',
  accompanyingDocumentAttachmentType: 'PDF',
  accompanyingDocumentReference: 'GBHC1234567890',
  'accompanyingDocumentDateOfIssue-day': '12',
  'accompanyingDocumentDateOfIssue-month': '12',
  'accompanyingDocumentDateOfIssue-year': '2025'
}

describe('POST documents — single-page add-another loop', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should re-render an unreal date of issue with its message and append nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'add',
        'accompanyingDocumentDateOfIssue-day': '31',
        'accompanyingDocumentDateOfIssue-month': '2',
        'accompanyingDocumentDateOfIssue-year': '2000'
      }
    })
    expect(
      result.view.context.errors['accompanyingDocumentDateOfIssue-day']
    ).toBe('Enter a real date of issue')
    expect(result.after).toEqual(result.before)
  })

  it('Should list added documents as read-back rows with a per-row remove link', async () => {
    const result = await driveHandler(get, {
      seed: {
        documents: [
          {
            accompanyingDocumentType: 'ITAHC',
            accompanyingDocumentAttachmentType: 'PDF',
            accompanyingDocumentReference: 'GBHC1234567890',
            accompanyingDocumentDateOfIssue: {
              day: '12',
              month: '12',
              year: '2025'
            }
          }
        ]
      }
    })
    const [row] = result.view.context.rows
    expect(row[0].text).toBe('GBHC1234567890')
    expect(row[1].text).toBe('ITAHC')
    expect(row[2].text).toBe('12/12/2025')
    expect(row[3].html).toContain('accompanying-documents/0/remove')
  })

  it('Should refuse an eleventh document with the maximum message and append nothing', async () => {
    const tenDocuments = Array.from(
      { length: documents.MAX_DOCUMENTS },
      () => ({
        accompanyingDocumentType: 'ITAHC',
        accompanyingDocumentAttachmentType: 'PDF',
        accompanyingDocumentReference: 'GBHC1234567890',
        accompanyingDocumentDateOfIssue: {
          day: '12',
          month: '12',
          year: '2025'
        }
      })
    )
    const result = await driveHandler(post, {
      seed: { documents: tenDocuments },
      payload: { action: 'add', ...validDocument }
    })
    expect(result.view.context.errors.accompanyingDocumentType).toBe(
      `You can add a maximum of ${documents.MAX_DOCUMENTS} documents`
    )
    expect(result.after.documents).toHaveLength(documents.MAX_DOCUMENTS)
  })

  it('Should treat a POST without the add action as Continue, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue', ...validDocument }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
  })
})
