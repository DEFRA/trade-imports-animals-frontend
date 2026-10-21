import { SET_BASE, SET_ID } from '../../../../set.js'
import Crumb from '@hapi/crumb'
import Hapi from '@hapi/hapi'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { pagePath } from '../../../../../../shared/paths.js'
import { SURFACES } from '../../../../../../shared/kit.js'
import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import {
  knownJourneysCookie,
  registerJourneyCookie
} from '../../../../../../engine/journey.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  registerTestRequestLogger,
  registerTestSessionAuth,
  stubH
} from '../../../../../../engine/test-support.js'
import { BackendRequestError } from '../../../../../../services/persistence/records/errors.js'
import { documentUploads } from '../../../../../../services/document-uploads/index.js'
import * as documentTypes from '../../../../../../services/document-types/index.js'
import { dispatchPages } from '../index.js'

import * as documents from './controller.js'
import { MAX_DOCUMENTS } from './contracts/max-documents.js'
import { documents as manifestDocuments } from '../../../../obligations/index.js'
import {
  FILE_TYPE_MESSAGE,
  MAX_FILE_SIZE_BYTES,
  MAX_PAYLOAD_BYTES,
  OVERSIZE_FILE_MESSAGE
} from './upload-config.js'

const serverWithDocumentRoutes = async ({
  cookies = false,
  crumb = false
} = {}) => {
  const server = Hapi.server()
  registerTestRequestLogger(server)
  registerTestSessionAuth(server)
  if (cookies) {
    registerJourneyCookie(server)
  }
  if (crumb) {
    await server.register(Crumb)
  }
  await server.register(
    {
      name: 'documents-under-test',
      register: (inner) => inner.route(documents.routes)
    },
    { routes: { prefix: SET_BASE } }
  )
  return server
}

const post = postHandlerOf(documents)
const get = documents.routes.find((route) => route.method === 'GET').handler
const statusRoute = documents.routes.find((route) =>
  route.path.endsWith('/status')
)
const fileRoute = documents.routes.find((route) => route.path.endsWith('/file'))

const pdfFile = (filename = 'itahc-certificate.pdf', size = 8) => ({
  filename,
  headers: { 'content-type': 'application/pdf' },
  payload: Buffer.alloc(size, 1)
})

const DOCUMENTS_SLUG = 'accompanying-documents'
const UNHELD_UPLOAD_ID = 'somebody-elses-upload-id'
const DATE_OF_ISSUE_TEXT = '12/12/2025'
const TAG_SCANNING = 'Scanning for virus'
const TAG_COMPLETE = 'Check completed'
const VIRUS_NOTES_FILENAME = 'virus-notes.pdf'
const UNOFFERED_TYPE = 'NOT_A_DOCUMENT_TYPE'

const validDocument = {
  accompanyingDocumentReference: 'GBHC1234567890',
  accompanyingDocumentType: 'ITAHC',
  accompanyingDocumentDateOfIssue: DATE_OF_ISSUE_TEXT
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

const unavailableBackend = () =>
  new BackendRequestError('save answers', {
    status: 503,
    statusText: 'Service Unavailable'
  })

const expectOneLogged = (logger, { level, fields, message }) =>
  expect(logger.entries).toEqual([{ level, fields, message }])

const expectContinueRefusedLogged = (result, scansNotCleared) =>
  expectOneLogged(result.logger, {
    level: 'info',
    fields: { journeyId: result.journeyId, scansNotCleared },
    message: 'Continue refused: documents not cleared by the virus scan'
  })

const configureEngine = () => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
}

describe('documents — real upload leg on the single-page loop', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  it('Should re-render an unreal date of issue with its message and append nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'add',
        file: pdfFile(),
        accompanyingDocumentType: 'ITAHC',
        accompanyingDocumentDateOfIssue: '31/2/2000'
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.accompanyingDocumentDateOfIssue).toBe(
      'Enter a real date'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should require a document reference, a document type and a date of issue at add time', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'add', file: pdfFile() }
    })
    expect(result.view.context.errors.accompanyingDocumentReference).toBe(
      'Enter a document reference'
    )
    expect(result.view.context.errors.accompanyingDocumentType).toBe(
      'Select a document type'
    )
    expect(result.view.context.errors.accompanyingDocumentDateOfIssue).toBe(
      'Enter a date of issue'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should list the add errors in the order the fields appear on the page', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'add' }
    })
    expect(Object.keys(result.view.context.errors)).toEqual([
      'accompanyingDocumentReference',
      'accompanyingDocumentType',
      'accompanyingDocumentDateOfIssue',
      'file'
    ])
  })

  it('Should refuse a document type the page never offered and append nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'add',
        ...validDocument,
        accompanyingDocumentType: UNOFFERED_TYPE,
        file: pdfFile()
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.accompanyingDocumentType).toBe(
      'Select a document type'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should not upload or persist an otherwise-started document with any mandatory form field blank', async () => {
    const upload = vi.spyOn(documentUploads, 'upload')
    const incompletePayloads = [
      {
        payload: {
          action: 'add',
          file: pdfFile(),
          accompanyingDocumentType: 'ITAHC',
          accompanyingDocumentDateOfIssue: DATE_OF_ISSUE_TEXT
        },
        errorField: 'accompanyingDocumentReference'
      },
      {
        payload: {
          action: 'add',
          file: pdfFile(),
          accompanyingDocumentReference: 'GBHC1234567890',
          accompanyingDocumentDateOfIssue: DATE_OF_ISSUE_TEXT
        },
        errorField: 'accompanyingDocumentType'
      },
      {
        payload: {
          action: 'add',
          file: pdfFile(),
          accompanyingDocumentReference: 'GBHC1234567890',
          accompanyingDocumentType: 'ITAHC'
        },
        errorField: 'accompanyingDocumentDateOfIssue'
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

  it('Should append the uploaded document with the chosen type and the attachment type derived from the filename, then redirect', async () => {
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

  it('Should hand the upload service the date of issue as YYYY-MM-DD, not the date parts the form collected', async () => {
    const upload = vi.spyOn(documentUploads, 'upload')

    const result = await driveHandler(post, {
      payload: { action: 'add', ...validDocument, file: pdfFile('itahc.pdf') }
    })

    expect(result.response.redirect).toBeDefined()
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ dateOfIssue: '2025-12-12' })
    )
    upload.mockRestore()
  })

  it('Should store the chosen type whatever the filename says', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'add',
        ...validDocument,
        accompanyingDocumentType: 'COMMERCIAL_INVOICE',
        file: pdfFile('itahc-certificate.pdf')
      }
    })
    const [entry] = result.after.documents
    expect(entry.accompanyingDocumentType).toBe('COMMERCIAL_INVOICE')
  })

  it('Should refuse an add without a file and append nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'add', ...validDocument }
    })
    expect(result.view.context.errors.file).toBe('Upload a document')
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
    const failure = new Error('upload service unavailable')
    const spy = vi
      .spyOn(documentUploads, 'upload')
      .mockRejectedValueOnce(failure)
    const result = await driveHandler(post, {
      payload: { action: 'add', ...validDocument, file: pdfFile('itahc.pdf') }
    })
    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.errors.file).toBeDefined()
    expect(result.after).toEqual(result.before)
    expectOneLogged(result.logger, {
      level: 'warn',
      fields: { journeyId: result.journeyId, err: failure },
      message: 'Document upload failed'
    })
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
    expectOneLogged(request.logger, {
      level: 'info',
      fields: { journeyId: journey.journeyId },
      message: 'Document refused: upload larger than the payload limit'
    })
  })
})

describe('documents — listing, scanning and removing', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  it('Should list added documents with a scan-status tag and a per-row remove submit button, not a link', async () => {
    const result = await driveHandler(get, {
      seed: { documents: [storedDocument()] }
    })
    const [row] = result.view.context.rows
    expect(row[0].text).toBe('GBHC1234567890')
    expect(row[1].text).toBe('Veterinary health certificate')
    expect(row[2].text).toBe(DATE_OF_ISSUE_TEXT)
    expect(row[3].html).toContain(TAG_COMPLETE)
    expect(row[4].html).toContain('<button type="submit"')
    expect(row[4].html).toContain('name="action" value="remove:0"')
    expect(row[4].html).not.toContain('href')
  })

  it('Should precede the status tag with a hidden label naming the document', async () => {
    const result = await driveHandler(get, {
      seed: { documents: [storedDocument()] }
    })
    expect(result.view.context.rows[0][3].html).toBe(
      '<span class="govuk-visually-hidden">Virus check status for GBHC1234567890</span>' +
        '<strong class="govuk-tag govuk-tag--green">Check completed</strong>'
    )
  })

  it('Should escape a document reference before putting it in the hidden label', async () => {
    const result = await driveHandler(get, {
      seed: {
        documents: [
          storedDocument({
            accompanyingDocumentReference: '<script>alert("x")</script>'
          })
        ]
      }
    })
    expect(result.view.context.rows[0][3].html).toContain(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    )
    expect(result.view.context.rows[0][3].html).not.toContain('<script>')
  })

  it('Should show Scanning for virus on every render of a fresh upload until a refresh-link GET settles it to Check completed', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const seed = {
      documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
    }
    const first = await driveHandler(get, { seed })
    expect(first.view.context.rows[0][3].html).toContain(TAG_SCANNING)
    expect(first.view.context.anyPending).toBe(true)
    expect(first.view.context.refreshHref).toContain('attempt=1')

    const stillPending = await driveHandler(get, { seed })
    expect(stillPending.view.context.rows[0][3].html).toContain(TAG_SCANNING)

    const refreshed = await driveHandler(get, { seed, query: { attempt: '1' } })
    expect(refreshed.view.context.rows[0][3].html).toContain(TAG_COMPLETE)
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
    expectContinueRefusedLogged(result, [{ uploadId, scanStatus: 'PENDING' }])
  })

  it('Should block Continue while a REJECTED document remains, naming the file', async () => {
    const uploadId = await documentUploads.upload({
      filename: VIRUS_NOTES_FILENAME
    })
    await documentUploads.scanStatus({
      uploadId,
      filename: VIRUS_NOTES_FILENAME,
      refresh: true
    })
    const seed = {
      documents: [storedDocument({ uploadId, filename: VIRUS_NOTES_FILENAME })]
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
    expectContinueRefusedLogged(result, [{ uploadId, scanStatus: 'REJECTED' }])
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
    expectOneLogged(result.logger, {
      level: 'info',
      fields: { journeyId: result.journeyId, index: 7 },
      message: 'Document removal refused: no document at the index'
    })
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
    const server = await serverWithDocumentRoutes({ crumb: true })

    const forged = await server.inject({
      method: 'POST',
      url: pagePath('journey-1', DOCUMENTS_SLUG),
      payload: { action: 'remove:0' }
    })
    expect(forged.statusCode).toBe(403)

    const prefetched = await server.inject({
      method: 'GET',
      url: pagePath('journey-1', 'accompanying-documents/0/remove')
    })
    expect(prefetched.statusCode).toBe(404)
  })

  it('Should refuse a document past the cap with the maximum message on the file field, linked from the summary, appending nothing', async () => {
    const documentsAtCapacity = Array.from({ length: MAX_DOCUMENTS }, () =>
      storedDocument()
    )
    const result = await driveHandler(post, {
      seed: { documents: documentsAtCapacity },
      payload: { action: 'add', ...validDocument, file: pdfFile() }
    })
    expect(result.response.statusCode).toBe(400)
    const limitMessage = `You can upload a maximum of ${MAX_DOCUMENTS} files`
    expect(result.view.context.errors.file).toBe(limitMessage)
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: limitMessage, href: '#file' }
    ])
    expect(result.after.documents).toHaveLength(MAX_DOCUMENTS)
    expectOneLogged(result.logger, {
      level: 'info',
      fields: {
        journeyId: result.journeyId,
        documentsHeld: MAX_DOCUMENTS,
        maxDocuments: MAX_DOCUMENTS
      },
      message:
        'Document refused: notification holds the maximum number of documents'
    })
  })

  it('Should derive the controller cap from the manifest, not a copied number', () => {
    expect(MAX_DOCUMENTS).toBe(manifestDocuments.requires.maxEntries)
  })

  it('Should treat a POST without the add action as Continue, appending nothing', async () => {
    const result = await driveHandler(post, { payload: {} })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
  })
})

describe('documents — Continue finishes a part-filled document', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  it('Should carry an untouched form past the page, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue' }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should save the document Continue carries rather than discard it', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue', ...validDocument, file: pdfFile() }
    })
    const [entry] = result.after.documents
    expect(entry.accompanyingDocumentReference).toBe('GBHC1234567890')
    expect(entry.accompanyingDocumentType).toBe('ITAHC')
    expect(entry.uploadId).toBeDefined()
  })

  it('Should redirect back to the page after saving the document Continue carries', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue', ...validDocument, file: pdfFile() }
    })
    expect(result.response.redirect).toContain(DOCUMENTS_SLUG)
    expect(result.after.documents).toHaveLength(1)
  })

  it('Should name what is missing when Continue carries a type and nothing else, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue', accompanyingDocumentType: 'ITAHC' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(Object.keys(result.view.context.errors)).toEqual([
      'accompanyingDocumentReference',
      'accompanyingDocumentDateOfIssue',
      'file'
    ])
    expect(result.after).toEqual(result.before)
  })

  it('Should carry a form with no document type chosen past the page, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'continue',
        accompanyingDocumentReference: 'GBHC1234567890',
        accompanyingDocumentDateOfIssue: DATE_OF_ISSUE_TEXT,
        file: pdfFile()
      }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should carry a form whose document type the page does not offer past the page, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'continue',
        ...validDocument,
        accompanyingDocumentType: UNOFFERED_TYPE,
        file: pdfFile()
      }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should leave a part-filled form behind on the exit to the overview, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: { exit: 'hub', ...validDocument, file: pdfFile() }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
  })
})

describe('documents — scan-status poll and view context', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

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
    expect(beforePoll.view.context.rows[0][3].html).toContain(TAG_SCANNING)

    const polled = await driveHandler(statusRoute.handler, { seed })
    expect(polled.response.payload.documents).toEqual([
      { uploadId, scanStatus: 'COMPLETE' }
    ])

    const afterPoll = await driveHandler(get, { seed })
    expect(afterPoll.view.context.rows[0][3].html).toContain(TAG_COMPLETE)
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

  it('Should render the page as a display surface', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.contentColumnClass).toBe(SURFACES.display)
  })

  it('Should hand the view the document limit the hint states, straight from the obligation', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.maxDocuments).toBe(MAX_DOCUMENTS)
    expect(result.view.context.maxDocuments).toBe(
      manifestDocuments.requires.maxEntries
    )
  })

  it('Should hand the view the browser-side upload limit and the scan copy the client rewrites tags with', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.maxFileSize).toBe(MAX_FILE_SIZE_BYTES)
    expect(result.view.context.oversizeFileMessage).toBe(OVERSIZE_FILE_MESSAGE)
    expect(JSON.parse(result.view.context.scanCopyJson)).toEqual({
      COMPLETE: {
        text: TAG_COMPLETE,
        classes: 'govuk-tag--green',
        announcement: 'Document scan complete: the file is safe to use'
      },
      REJECTED: {
        text: 'Virus found',
        classes: 'govuk-tag--red',
        announcement:
          'Document scan failed: a virus was found. Remove the file and try again.'
      },
      PENDING: { text: TAG_SCANNING, classes: 'govuk-tag--blue' },
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
    const fileHref = pagePath(
      settled.journeyId,
      `accompanying-documents/${uploadId}/file`
    )
    expect(settled.view.context.rows[0][4].html).toContain(`href="${fileHref}"`)
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

  it('Should offer all fourteen document types behind a placeholder, in the service order', async () => {
    const result = await driveHandler(get)
    const items = result.view.context.documentTypeItems
    expect(items[0]).toEqual({ value: '', text: 'Select one' })
    expect(items.slice(1).map(({ value }) => value)).toEqual(
      documentTypes.documentTypes()
    )
    expect(items.slice(1).map(({ text }) => text)).toEqual([
      'Intra Trade Animal Health Certificate (ITAHC)',
      'Veterinary health certificate',
      'Air waybill',
      'Import permit',
      'Letter of authority (Directive 2008/61/EC)',
      'Commercial invoice',
      'Sea waybill',
      'Rail waybill',
      'Bill of lading',
      'Catch certificate',
      'Laboratory sampling results for aflatoxin (Reg 2019/1793)',
      'Health certificate',
      'Journey log',
      'Other'
    ])
    expect(result.view.context.values.accompanyingDocumentType).toBe('')
  })

  it('Should register the multipart POST route with the 10MB payload cap', async () => {
    const server = await serverWithDocumentRoutes()
    const route = server.table().find((entry) => entry.method === 'post')
    expect(route.settings.payload.maxBytes).toBe(MAX_PAYLOAD_BYTES)
    expect(route.settings.payload.multipart).toEqual({ output: 'annotated' })
  })
})

describe('documents — reading an uploaded file back', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  const journeyHolding = async (uploadId) => {
    const server = await serverWithDocumentRoutes({ cookies: true })
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
      documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
    })
    return { server, journeyId: journey.journeyId }
  }

  const knownCookie = (journeyIds) =>
    `${knownJourneysCookie()}=${Buffer.from(
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

  it('Should log the refusal when the upload id is not held by the journey', async () => {
    const result = await driveHandler(fileRoute.handler, {
      params: { uploadId: UNHELD_UPLOAD_ID },
      seed: { documents: [storedDocument({ uploadId: 'up-held' })] }
    })
    expect(result.response.statusCode).toBe(404)
    expectOneLogged(result.logger, {
      level: 'info',
      fields: {
        journeyId: result.journeyId,
        uploadId: UNHELD_UPLOAD_ID
      },
      message: 'Document file refused: upload not held by the journey'
    })
  })

  it('Should answer 404 for a well-formed upload id the journey does not hold', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const held = await journeyHolding(uploadId)

    const response = await readFile(held, UNHELD_UPLOAD_ID)

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
    const server = await serverWithDocumentRoutes({ cookies: true })
    const journey = await store.create()

    const response = await server.inject({
      method: 'GET',
      url: pagePath(journey.journeyId, 'accompanying-documents/up-1234/file'),
      headers: { cookie: knownCookie([journey.journeyId]) }
    })

    expect(response.statusCode).toBe(404)
  })
})

describe('documents — backend and upload service failures', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  const REMOVAL_LEFT_TO_RETRY =
    'Document not removed: backend unavailable, removal left to retry'
  const ALREADY_REMOVED_UPLOAD_ID = 'up-already-removed'
  const retryRemovalPayload = {
    action: 'continue',
    retryRemoveIndex: '0',
    retryRemoveUploadId: ALREADY_REMOVED_UPLOAD_ID
  }
  const alreadyRemovedEntry = (journeyId) => ({
    level: 'info',
    fields: { journeyId, index: 0, uploadId: ALREADY_REMOVED_UPLOAD_ID },
    message: 'Document already removed: saving the notification without it'
  })

  const seededUpload = async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    return {
      uploadId,
      seed: { documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })] }
    }
  }

  it('Should log the save left to retry with the backend error, keeping the uploaded file for the retry', async () => {
    const failure = unavailableBackend()
    const result = await driveHandler(post, {
      saveFailure: failure,
      payload: { action: 'add', ...validDocument, file: pdfFile('itahc.pdf') }
    })
    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expectOneLogged(result.logger, {
      level: 'warn',
      fields: {
        journeyId: result.journeyId,
        uploadId: result.view.context.pendingDocumentSave.uploadId,
        err: failure
      },
      message: 'Document not saved: backend unavailable, save left to retry'
    })
  })

  it('Should log the upload service failure and keep the document when its upload cannot be removed', async () => {
    const { uploadId, seed } = await seededUpload()
    const failure = new Error('upload service unavailable')
    const spy = vi
      .spyOn(documentUploads, 'remove')
      .mockRejectedValueOnce(failure)
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove:0' }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(seed)
    expectOneLogged(result.logger, {
      level: 'warn',
      fields: { journeyId: result.journeyId, uploadId, err: failure },
      message: 'Document not removed: upload service failed, document kept'
    })
    spy.mockRestore()
  })

  it('Should log the removal left to retry with the backend error, keeping the document', async () => {
    const { uploadId, seed } = await seededUpload()
    const failure = unavailableBackend()
    const result = await driveHandler(post, {
      seed,
      saveFailure: failure,
      payload: { action: 'remove:0' }
    })
    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual(seed)
    expectOneLogged(result.logger, {
      level: 'warn',
      fields: { journeyId: result.journeyId, index: 0, uploadId, err: failure },
      message: REMOVAL_LEFT_TO_RETRY
    })
  })

  it('Should log that a retried removal found the document already gone, then save the notification without it', async () => {
    const result = await driveHandler(post, { payload: retryRemovalPayload })
    expect(result.response.redirect).toContain(DOCUMENTS_SLUG)
    expectOneLogged(result.logger, alreadyRemovedEntry(result.journeyId))
  })

  it('Should log the retried removal left to retry again, with the backend error, when the notification still cannot be saved', async () => {
    const failure = unavailableBackend()
    const result = await driveHandler(post, {
      saveFailure: failure,
      payload: retryRemovalPayload
    })
    expect(result.response.statusCode).toBe(500)
    expect(result.logger.entries).toEqual([
      alreadyRemovedEntry(result.journeyId),
      {
        level: 'warn',
        fields: {
          journeyId: result.journeyId,
          index: 0,
          uploadId: ALREADY_REMOVED_UPLOAD_ID,
          err: failure
        },
        message: REMOVAL_LEFT_TO_RETRY
      }
    ])
  })
})
