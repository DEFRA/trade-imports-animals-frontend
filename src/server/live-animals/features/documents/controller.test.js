import Crumb from '@hapi/crumb'
import Hapi from '@hapi/hapi'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { pagePath } from '../../config.js'
import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import {
  KNOWN_JOURNEYS_COOKIE,
  registerJourneyCookie
} from '../../engine/journey.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../engine/test-support.js'
import { documentUploads } from '../../services/document-uploads/index.js'
import { dispatchPages } from '../index.js'

import * as documents from './controller.js'
import { documents as manifestDocuments } from '../../model/obligations/obligations.js'
import {
  FILE_TYPE_MESSAGE,
  MAX_FILE_SIZE_BYTES,
  MAX_PAYLOAD_BYTES,
  OVERSIZE_FILE_MESSAGE
} from './upload-config.js'

const post = postHandlerOf(documents)
const get = documents.routes.find((route) => route.method === 'GET').handler
const statusRoute = documents.routes.find((route) =>
  route.path.endsWith('/status')
)

const pdfFile = (filename = 'itahc-certificate.pdf', size = 8) => ({
  filename,
  headers: { 'content-type': 'application/pdf' },
  payload: Buffer.alloc(size, 1)
})

const validDocument = {
  accompanyingDocumentReference: 'GBHC1234567890',
  'accompanyingDocumentDateOfIssue-day': '12',
  'accompanyingDocumentDateOfIssue-month': '12',
  'accompanyingDocumentDateOfIssue-year': '2025'
}

const storedDocument = (overrides = {}) => ({
  accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE',
  accompanyingDocumentAttachmentType: 'PDF',
  accompanyingDocumentReference: 'GBHC1234567890',
  accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' },
  ...overrides
})

const summaryTexts = (result) =>
  (result.view.context.errorSummary?.errorList ?? []).map((item) => item.text)

describe('documents — real upload leg on the single-page loop', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should re-render an unreal date of issue with its message and append nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'add',
        file: pdfFile(),
        'accompanyingDocumentDateOfIssue-day': '31',
        'accompanyingDocumentDateOfIssue-month': '2',
        'accompanyingDocumentDateOfIssue-year': '2000'
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(
      result.view.context.errors['accompanyingDocumentDateOfIssue-day']
    ).toBe('Enter a real date of issue')
    expect(result.after).toEqual(result.before)
  })

  it('Should require a document reference and a date of issue at add time', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'add', file: pdfFile() }
    })
    expect(result.view.context.errors.accompanyingDocumentReference).toBe(
      'Enter a document reference'
    )
    expect(
      result.view.context.errors['accompanyingDocumentDateOfIssue-day']
    ).toBe('Enter the date of issue')
    expect(result.after).toEqual(result.before)
  })

  it('Should not upload or persist an otherwise-started document with either mandatory form field blank', async () => {
    const upload = vi.spyOn(documentUploads, 'upload')
    const incompletePayloads = [
      {
        payload: {
          action: 'add',
          file: pdfFile(),
          'accompanyingDocumentDateOfIssue-day': '12',
          'accompanyingDocumentDateOfIssue-month': '12',
          'accompanyingDocumentDateOfIssue-year': '2025'
        },
        errorField: 'accompanyingDocumentReference'
      },
      {
        payload: {
          action: 'add',
          file: pdfFile(),
          accompanyingDocumentReference: 'GBHC1234567890'
        },
        errorField: 'accompanyingDocumentDateOfIssue-day'
      }
    ]

    for (const { payload, errorField } of incompletePayloads) {
      const result = await driveHandler(post, { payload })
      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[errorField]).toBeDefined()
      expect(result.after).toEqual(result.before)
    }
    expect(upload).not.toHaveBeenCalled()
    upload.mockRestore()
  })

  it('Should append the uploaded document with the type and attachment type derived from the filename, then redirect', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'add', ...validDocument, file: pdfFile('itahc.pdf') }
    })
    expect(result.response.redirect).toBeDefined()
    const [entry] = result.after.documents
    expect(entry.accompanyingDocumentAttachmentType).toBe('PDF')
    expect(entry.filename).toBe('itahc.pdf')
    expect(entry.uploadId).toBeDefined()
    expect(entry.accompanyingDocumentType).toBe('ITAHC')
  })

  it('Should derive Other for a filename matching no document type', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'add',
        ...validDocument,
        file: pdfFile('holiday-snaps.pdf')
      }
    })
    const [entry] = result.after.documents
    expect(entry.accompanyingDocumentType).toBe('OTHER')
  })

  it('Should refuse an add without a file and append nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'add', ...validDocument }
    })
    expect(result.view.context.errors.file).toBe('Select a file to upload')
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file type outside the allow-list', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'add', ...validDocument, file: pdfFile('notes.zip') }
    })
    expect(result.view.context.errors.file).toBe(FILE_TYPE_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file over the 10MB limit', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'add',
        ...validDocument,
        file: pdfFile('big.pdf', MAX_FILE_SIZE_BYTES + 1)
      }
    })
    expect(result.view.context.errors.file).toBe(OVERSIZE_FILE_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should answer 500 when the upload service fails, re-rendering the failure and appending nothing', async () => {
    const spy = vi
      .spyOn(documentUploads, 'upload')
      .mockRejectedValueOnce(new Error('upload service unavailable'))
    const result = await driveHandler(post, {
      payload: { action: 'add', ...validDocument, file: pdfFile('itahc.pdf') }
    })
    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.errors.file).toBeDefined()
    expect(result.after).toEqual(result.before)
    spy.mockRestore()
  })

  it('Should answer 400 from the oversize-payload safety net rather than a bare 413', async () => {
    const journey = await store.create()
    const h = stubH()
    const request = journeyRequest(journey.journeyId, {
      response: { isBoom: true, output: { statusCode: 413 } },
      state: { crumb: 'test-crumb' }
    })
    const response = await documents.handleOversizePayload(request, h)
    expect(response.statusCode).toBe(400)
    expect(h.captured.view.context.errors.file).toBe(OVERSIZE_FILE_MESSAGE)
  })

  it('Should list added documents with a scan-status tag and a per-row remove submit button, not a link', async () => {
    const result = await driveHandler(get, {
      seed: { documents: [storedDocument()] }
    })
    const [row] = result.view.context.rows
    expect(row[0].text).toBe('GBHC1234567890')
    expect(row[1].text).toBe('Veterinary health certificate')
    expect(row[2].text).toBe('12/12/2025')
    expect(row[3].html).toContain('Safe')
    expect(row[4].html).toContain('<button type="submit"')
    expect(row[4].html).toContain('name="action" value="remove:0"')
    expect(row[4].html).not.toContain('href')
  })

  it('Should show Checking on every render of a fresh upload until a refresh-link GET settles it to Safe', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const seed = {
      documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
    }
    const first = await driveHandler(get, { seed })
    expect(first.view.context.rows[0][3].html).toContain('Checking')
    expect(first.view.context.anyPending).toBe(true)
    expect(first.view.context.refreshHref).toContain('attempt=1')

    const stillPending = await driveHandler(get, { seed })
    expect(stillPending.view.context.rows[0][3].html).toContain('Checking')

    const refreshed = await driveHandler(get, { seed, query: { attempt: '1' } })
    expect(refreshed.view.context.rows[0][3].html).toContain('Safe')
    expect(refreshed.view.context.anyPending).toBe(false)

    const settled = await driveHandler(post, {
      seed,
      payload: { action: 'continue' }
    })
    expect(settled.response.redirect).toBeDefined()
  })

  it('Should block Continue while a scan is PENDING, naming the reason', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const result = await driveHandler(post, {
      seed: {
        documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
      },
      payload: { action: 'continue' }
    })
    expect(result.response.statusCode).toBe(200)
    expect(result.response.redirect).toBeUndefined()
    expect(summaryTexts(result)).toContain(
      'You cannot continue until all documents have been scanned or removed'
    )
  })

  it('Should block Continue while a REJECTED document remains, naming the file', async () => {
    const uploadId = await documentUploads.upload({
      filename: 'virus-notes.pdf'
    })
    await documentUploads.scanStatus({
      uploadId,
      filename: 'virus-notes.pdf',
      refresh: true
    })
    const seed = {
      documents: [storedDocument({ uploadId, filename: 'virus-notes.pdf' })]
    }
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'continue' }
    })
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.rows[0][3].html).toContain('Virus found')
    expect(summaryTexts(result)).toContain(
      'virus-notes.pdf contains a virus. Remove it and try again with a different file.'
    )
  })

  it('Should let the hub exit leave the page while a scan is PENDING', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const result = await driveHandler(post, {
      seed: {
        documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
      },
      payload: { action: 'continue', exit: 'hub' }
    })
    expect(result.response.redirect).toBeDefined()
  })

  it('Should remove the named document and its upload session on the remove POST, leaving the others', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const result = await driveHandler(post, {
      seed: {
        documents: [
          storedDocument({ accompanyingDocumentReference: 'KEEP-ME' }),
          storedDocument({ uploadId, filename: 'itahc.pdf' })
        ]
      },
      payload: { action: 'remove:1' }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after.documents).toHaveLength(1)
    expect(result.after.documents[0].accompanyingDocumentReference).toBe(
      'KEEP-ME'
    )
  })

  it('Should refuse a remove for an index outside the collection and delete nothing', async () => {
    const seed = { documents: [storedDocument()] }
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove:7' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.after).toEqual(seed)
  })

  it('Should refuse a remove whose index is not a number and delete nothing', async () => {
    const seed = { documents: [storedDocument()] }
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove:../0' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.after).toEqual(seed)
  })

  it('Should reject a remove POST carrying no CSRF crumb and serve no GET route that removes', async () => {
    const server = Hapi.server()
    await server.register(Crumb)
    server.route(documents.routes)

    const forged = await server.inject({
      method: 'POST',
      url: pagePath('journey-1', 'accompanying-documents'),
      payload: { action: 'remove:0' }
    })
    expect(forged.statusCode).toBe(403)

    const prefetched = await server.inject({
      method: 'GET',
      url: pagePath('journey-1', 'accompanying-documents/0/remove')
    })
    expect(prefetched.statusCode).toBe(404)
  })

  it('Should refuse an eleventh document with the maximum message and append nothing', async () => {
    const tenDocuments = Array.from({ length: documents.MAX_DOCUMENTS }, () =>
      storedDocument()
    )
    const result = await driveHandler(post, {
      seed: { documents: tenDocuments },
      payload: { action: 'add', ...validDocument, file: pdfFile() }
    })
    expect(result.response.statusCode).toBe(400)
    expect(summaryTexts(result)).toContain(
      `You can add a maximum of ${documents.MAX_DOCUMENTS} documents`
    )
    expect(result.after.documents).toHaveLength(documents.MAX_DOCUMENTS)
  })

  it('Should derive the controller cap from the manifest, not a copied number', () => {
    expect(documents.MAX_DOCUMENTS).toBe(manifestDocuments.requires.maxEntries)
  })

  it('Should treat a POST without the add action as Continue, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue', ...validDocument }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should serve the scan statuses the client polls, keyed by upload id', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const result = await driveHandler(statusRoute.handler, {
      seed: {
        documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
      }
    })
    expect(result.response.payload.documents).toEqual([
      { uploadId, scanStatus: 'COMPLETE' }
    ])
  })

  it('Should settle a pending scan through the poll leg, as the refresh link does', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const seed = {
      documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
    }
    const beforePoll = await driveHandler(get, { seed })
    expect(beforePoll.view.context.rows[0][3].html).toContain('Checking')

    const polled = await driveHandler(statusRoute.handler, { seed })
    expect(polled.response.payload.documents).toEqual([
      { uploadId, scanStatus: 'COMPLETE' }
    ])

    const afterPoll = await driveHandler(get, { seed })
    expect(afterPoll.view.context.rows[0][3].html).toContain('Safe')
  })

  it('Should report a rejected scan so the client can rewrite the tag', async () => {
    const uploadId = await documentUploads.upload({ filename: 'virus.pdf' })
    const result = await driveHandler(statusRoute.handler, {
      seed: {
        documents: [storedDocument({ uploadId, filename: 'virus.pdf' })]
      }
    })
    expect(result.response.payload.documents).toEqual([
      { uploadId, scanStatus: 'REJECTED' }
    ])
  })

  it('Should leave documents with no upload out of the poll payload — the client keys on upload id', async () => {
    const result = await driveHandler(statusRoute.handler, {
      seed: { documents: [storedDocument()] }
    })
    expect(result.response.payload.documents).toEqual([])
  })

  it('Should tag every uploaded row with its upload id and current scan status', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const result = await driveHandler(get, {
      seed: {
        documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
      }
    })
    expect(result.view.context.rows[0][3].attributes).toEqual({
      'data-upload-id': uploadId,
      'data-scan-status': 'PENDING'
    })
  })

  it('Should hand the view the browser-side upload limit and the scan copy the client rewrites tags with', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.maxFileSize).toBe(MAX_FILE_SIZE_BYTES)
    expect(result.view.context.oversizeFileMessage).toBe(OVERSIZE_FILE_MESSAGE)
    expect(JSON.parse(result.view.context.scanCopyJson)).toEqual({
      COMPLETE: {
        text: 'Safe',
        classes: 'govuk-tag--green',
        announcement: 'Document scan complete: the file is safe to use'
      },
      REJECTED: {
        text: 'Virus found',
        classes: 'govuk-tag--red',
        announcement:
          'Document scan failed: a virus was found. Remove the file and try again.'
      },
      PENDING: { text: 'Checking', classes: 'govuk-tag--blue' },
      UNKNOWN: { text: 'Unknown', classes: 'govuk-tag--grey' }
    })
  })

  it('Should offer View file only once a scan has settled clean, alongside Remove', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const seed = {
      documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
    }

    const pending = await driveHandler(get, { seed })
    expect(pending.view.context.rows[0][4].html).not.toContain('View file')
    expect(pending.view.context.rows[0][4].html).toContain('Remove')

    await driveHandler(statusRoute.handler, { seed })

    const settled = await driveHandler(get, { seed })
    expect(settled.view.context.rows[0][4].html).toContain(
      `href="${pagePath(settled.journeyId, `accompanying-documents/${uploadId}/file`)}"`
    )
    expect(settled.view.context.rows[0][4].html).toContain('Remove')
  })

  it('Should hand the actions cell the feature copy needed for an in-place poll update', async () => {
    const result = await driveHandler(get, {
      seed: { documents: [storedDocument(), storedDocument()] }
    })

    expect(result.view.context.rows[0][4].attributes).toEqual({
      'data-view-file-text': 'View file',
      'data-view-file-hidden': 'for document 1'
    })
    expect(result.view.context.rows[1][4].attributes).toEqual({
      'data-view-file-text': 'View file',
      'data-view-file-hidden': 'for document 2'
    })
  })

  it('Should offer no View file for a document that never reached an upload', async () => {
    const result = await driveHandler(get, {
      seed: { documents: [storedDocument()] }
    })
    expect(result.view.context.rows[0][4].html).not.toContain('View file')
  })

  it('Should register the multipart POST route with the 10MB payload cap', () => {
    const server = Hapi.server()
    server.route(documents.routes)
    const route = server.table().find((entry) => entry.method === 'post')
    expect(route.settings.payload.maxBytes).toBe(MAX_PAYLOAD_BYTES)
    expect(route.settings.payload.multipart).toEqual({ output: 'annotated' })
  })
})

describe('documents — reading an uploaded file back', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  const journeyHolding = async (uploadId) => {
    const server = Hapi.server()
    registerJourneyCookie(server)
    server.route(documents.routes)
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
      documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
    })
    return { server, journeyId: journey.journeyId }
  }

  const knownCookie = (journeyIds) =>
    `${KNOWN_JOURNEYS_COOKIE}=${Buffer.from(
      JSON.stringify(journeyIds)
    ).toString('base64')}`

  const readFile = (
    { server, journeyId },
    uploadId,
    knownJourneyIds = [journeyId]
  ) =>
    server.inject({
      method: 'GET',
      url: pagePath(journeyId, `accompanying-documents/${uploadId}/file`),
      headers: { cookie: knownCookie(knownJourneyIds) }
    })

  it('Should stream an owned upload with its content type, disposition and nosniff', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const held = await journeyHolding(uploadId)

    const response = await readFile(held, uploadId)

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toMatch(/^application\/pdf/)
    expect(response.headers['content-disposition']).toBe(
      'inline; filename="placeholder.pdf"'
    )
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.payload.startsWith('%PDF-')).toBe(true)
  })

  it('Should answer 404 for a well-formed upload id the journey does not hold', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const held = await journeyHolding(uploadId)

    const response = await readFile(held, 'somebody-elses-upload-id')

    expect(response.statusCode).toBe(404)
  })

  it("Should not expose journey A's upload through journey B's URL in one session", async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const heldByA = await journeyHolding(uploadId)
    const journeyB = await store.create()

    const response = await readFile(
      { server: heldByA.server, journeyId: journeyB.journeyId },
      uploadId,
      [heldByA.journeyId, journeyB.journeyId]
    )

    expect(response.statusCode).toBe(404)
  })

  it('Should refuse a malformed upload id before it reaches the upload service', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const held = await journeyHolding(uploadId)

    const response = await readFile(held, 'up_1234%20')

    expect(response.statusCode).toBe(400)
  })

  it('Should answer 404 for a journey with no documents at all', async () => {
    const server = Hapi.server()
    registerJourneyCookie(server)
    server.route(documents.routes)
    const journey = await store.create()

    const response = await server.inject({
      method: 'GET',
      url: pagePath(journey.journeyId, 'accompanying-documents/up-1234/file'),
      headers: { cookie: knownCookie([journey.journeyId]) }
    })

    expect(response.statusCode).toBe(404)
  })
})
