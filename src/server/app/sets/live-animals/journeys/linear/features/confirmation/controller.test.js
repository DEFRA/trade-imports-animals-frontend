import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { hubPath } from '../../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as confirmation from './controller.js'
import { copy } from './copy/copy.en.js'

const get = confirmation.routes.find((route) => route.method === 'GET').handler

const DOCUMENT = {
  accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE',
  accompanyingDocumentAttachmentType: 'PDF',
  accompanyingDocumentReference: 'GBHC1234567890',
  accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' }
}

const submittedView = async (seed) => {
  const { journeyId } = await store.create()
  if (seed) {
    await store.seedAnswers(journeyId, seed)
  }
  await store.submit(journeyId)
  const h = stubH()
  await get(journeyRequest(journeyId), h)
  return h.captured.view
}

describe('GET /confirmation', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should render the confirmation panel with the reference and submission date for a submitted notification', async () => {
    const { journeyId } = await store.create()
    await store.submit(journeyId)
    const h = stubH()

    await get(journeyRequest(journeyId), h)

    expect(h.captured.view.context.pageTitle).toBe(
      'Import notification submitted'
    )
    expect(h.captured.view.context.referenceNumber).toBe(journeyId)
    expect(h.captured.view.context.submissionDate).toMatch(
      /^\d{1,2} \w+ \d{4}$/
    )
  })

  // Documents are optional at submission, so the trader can land here with the
  // health certificate still to come — the submitted page is the last place the
  // service can say so.
  it('Should list the outstanding documents when nothing has been uploaded', async () => {
    const view = await submittedView()

    expect(view.context.outstandingItems).toEqual([copy.outstanding.documents])
  })

  it('Should list nothing outstanding when a document has been uploaded', async () => {
    const view = await submittedView({ documents: [DOCUMENT] })

    expect(view.context.outstandingItems).toEqual([])
  })

  it('Should redirect a notification that is not submitted to the hub', async () => {
    const { journeyId } = await store.create()

    const response = await get(journeyRequest(journeyId), stubH())

    expect(response).toEqual({ redirect: hubPath(journeyId) })
  })
})
