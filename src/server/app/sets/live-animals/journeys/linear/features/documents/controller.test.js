import { randomUUID } from 'node:crypto'
import { SET_BASE, SET_ID } from '../../../../set.js'
import Crumb from '@hapi/crumb'
import Hapi from '@hapi/hapi'
import { load } from 'cheerio'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import { pagePath } from '../../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import {
  knownJourneysCookie,
  registerJourneyCookie
} from '../../../../../../engine/journey.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import * as state from '../../../../../../engine/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import { BackendRequestError } from '../../../../../../services/persistence/records/errors.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf,
  registerTestSessionAuth
} from '../../../../../../engine/test-support.js'
import { documentUploads } from '../../../../../../services/document-uploads/index.js'
import { documentUploadSessions } from '../../../../../../services/cdp-uploader/index.js'
import * as documentTypes from '../../../../../../services/document-types/index.js'
import { dispatchPages } from '../index.js'

import * as documents from './controller.js'
import { ADD_DOCUMENT_ANCHOR } from './contracts/add-document-anchor.js'
import { MAX_DOCUMENTS } from './contracts/max-documents.js'
import { documents as manifestDocuments } from '../../../../obligations/index.js'
import {
  ALLOWED_MIME_TYPES,
  FILE_TYPE_MESSAGE,
  MAX_FILE_SIZE_BYTES,
  OVERSIZE_FILE_MESSAGE
} from './upload-config.js'

/**
 * Mounts the document routes the way the router does — under the set's prefix —
 * so an injected `pagePath()` URL reaches them. Registering them bare would
 * leave every prefixed inject 404ing.
 *
 * @param {object} [options]
 * @param {boolean} [options.cookies] - register this set's journey cookies.
 * @param {boolean} [options.crumb] - register CSRF protection, for the tests
 * that ask what an unprotected POST does.
 */
const serverWithDocumentRoutes = async ({
  cookies = false,
  crumb = false
} = {}) => {
  const server = Hapi.server()
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

const PDF_FILENAME = 'itahc-certificate.pdf'

const DATE_OF_ISSUE_TEXT = '12/12/2025'
// Pinned as literals rather than read from copy, so a rewording fails a test.
const TAG_SCANNING = 'Scanning for virus'
const TAG_COMPLETE = 'Check completed'
const FILE_REQUIRED_MESSAGE = 'Upload a document'
const FILE_EMPTY_MESSAGE = 'The selected file is empty'
const NOT_YET_ADDED_MESSAGE =
  'Choose a file and select ‘Save and add another’ to add this document'
const CONTINUE_AT_CAPACITY_LINE =
  'Continue refused: the notification is at its document capacity'
const CONTINUE_NOT_ADDED_LINE =
  'Continue refused: the document has not been added'
const TYPE_REQUIRED_MESSAGE = 'Select a document type'
const VIRUS_NOTES_FILENAME = 'virus-notes.pdf'
// A value the select never carries: only a tampered form could send it.
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

const UNREGISTERED_CORRELATION_ID = randomUUID()
const TRAVERSING_CORRELATION_ID = '../../notifications/another-notification'

const submittedFile = (overrides = {}) => ({
  filename: PDF_FILENAME,
  contentType: 'application/pdf',
  contentLength: 8,
  fileStatus: 'complete',
  hasError: false,
  ...overrides
})

const registeredSession = async (journeyId) => {
  const correlationId = randomUUID()
  const { uploadId } = await documentUploadSessions.open({
    journeyId,
    correlationId,
    maxFileSize: MAX_FILE_SIZE_BYTES,
    mimeTypes: ALLOWED_MIME_TYPES
  })
  await documentUploads.register({ journeyId, uploadId, correlationId })
  return { journeyId, correlationId, uploadId }
}

/**
 * Drives the page the way the upload service returns the browser to it: a session opened and
 * registered against the notification through the stub adapters, and the submitted form read
 * back from it. Only the read is stood in for, because the stand-in service cannot produce
 * every file entry cdp-uploader can — an empty-file code and an absent file entry among them.
 *
 * @param {object} form - the form the session answers with
 * @param {object} [options] - `driveHandler` options, plus `session` to replay one and
 *   `claimError` to refuse the claim
 * @returns {Promise<object>} what `driveHandler` reports, plus the `session` it drove
 */
const driveClaim = async (
  form,
  { claimError = null, session = null, ...options } = {}
) => {
  const { journeyId, correlationId, uploadId } =
    session ?? (await registeredSession((await store.create()).journeyId))
  const read = vi
    .spyOn(documentUploadSessions, 'read')
    .mockResolvedValue({ uploadStatus: 'pending', form })
  const claim = claimError
    ? vi.spyOn(documentUploads, 'claim').mockRejectedValue(claimError)
    : null
  try {
    const result = await driveHandler(get, {
      ...options,
      journeyId,
      query: { upload: correlationId }
    })
    return { ...result, session: { journeyId, correlationId, uploadId } }
  } finally {
    read.mockRestore()
    claim?.mockRestore()
  }
}

const submittedDocument = (overrides = {}) => ({
  ...validDocument,
  file: submittedFile(),
  ...overrides
})

let nextUploadSession = 0
const registeredUpload = async (filename) => {
  nextUploadSession += 1
  const uploadId = randomUUID()
  await documentUploads.register({
    journeyId: 'journey-1',
    uploadId,
    correlationId: `correlation-${nextUploadSession}`
  })
  await documentUploads.scanStatus({ uploadId, filename })
  return uploadId
}

/** The payload cap a route carries when it sets none, read from hapi itself. */
const uncappedRouteMaxBytes = async () => {
  const server = Hapi.server()
  server.route({ method: 'POST', path: '/', handler: () => null })
  const [route] = server.table()
  return route.settings.payload.maxBytes
}

const summaryTexts = (result) =>
  (result.view.context.errorSummary?.errorList ?? []).map((item) => item.text)

const linesLogged = (result, message) =>
  result.logger.entries.filter((entry) => entry.message === message)

const errorEntries = ({ logger }) =>
  logger.entries.filter(({ level }) => level === 'error')

const SERVICE_UNAVAILABLE = 503

const backendRefusal = () =>
  new BackendRequestError('save answers', {
    status: SERVICE_UNAVAILABLE,
    statusText: 'Service Unavailable'
  })

const configureEngine = () => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
}

describe('documents — taking on an upload the browser returns with', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  it('Should re-render an unreal date of issue with its message and append nothing', async () => {
    const result = await driveClaim({
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentDateOfIssue: '31/2/2000',
      file: submittedFile()
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.accompanyingDocumentDateOfIssue).toBe(
      'Enter a real date'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should require a document reference, a document type and a date of issue', async () => {
    const result = await driveClaim({ file: submittedFile() })

    expect(result.view.context.errors.accompanyingDocumentReference).toBe(
      'Enter a document reference'
    )
    expect(result.view.context.errors.accompanyingDocumentType).toBe(
      TYPE_REQUIRED_MESSAGE
    )
    expect(result.view.context.errors.accompanyingDocumentDateOfIssue).toBe(
      'Enter a date of issue'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should list the errors in the order the fields appear on the page', async () => {
    const result = await driveClaim({ file: submittedFile() })

    expect(Object.keys(result.view.context.errors)).toEqual([
      'accompanyingDocumentReference',
      'accompanyingDocumentType',
      'accompanyingDocumentDateOfIssue'
    ])
  })

  it('Should name a refused file alongside the missing fields, in page order', async () => {
    const result = await driveClaim({
      file: submittedFile({ hasError: true, errorCode: 'FILE_TOO_LARGE' })
    })

    expect(Object.keys(result.view.context.errors)).toEqual([
      'accompanyingDocumentReference',
      'accompanyingDocumentType',
      'accompanyingDocumentDateOfIssue',
      'file'
    ])
    expect(result.view.context.errors.file).toBe(OVERSIZE_FILE_MESSAGE)
  })

  it('Should refuse a document type the page never offered and append nothing', async () => {
    const result = await driveClaim(
      submittedDocument({ accompanyingDocumentType: UNOFFERED_TYPE })
    )
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.accompanyingDocumentType).toBe(
      TYPE_REQUIRED_MESSAGE
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should append the document with the chosen type and the attachment type derived from the filename, then redirect', async () => {
    const result = await driveClaim(
      submittedDocument({ file: submittedFile({ filename: 'itahc.pdf' }) })
    )
    expect(result.response.redirect).toBeDefined()
    const [entry] = result.after.documents
    expect(entry.accompanyingDocumentAttachmentType).toBe('PDF')
    expect(entry.filename).toBe('itahc.pdf')
    expect(entry.uploadId).toBe(result.session.uploadId)
    expect(entry.accompanyingDocumentType).toBe('ITAHC')
  })

  it('Should store the chosen type whatever the filename says', async () => {
    const result = await driveClaim(
      submittedDocument({
        accompanyingDocumentType: 'COMMERCIAL_INVOICE',
        file: submittedFile({ filename: PDF_FILENAME })
      })
    )
    const [entry] = result.after.documents
    expect(entry.accompanyingDocumentType).toBe('COMMERCIAL_INVOICE')
  })
})

describe('documents — refusing an upload the browser returns with', () => {
  it('Should refuse a return whose session holds no file entry and append nothing', async () => {
    const result = await driveClaim({ ...validDocument })

    expect(result.view.context.errors.file).toBe(FILE_REQUIRED_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file the upload service took but which carries no bytes, and append nothing', async () => {
    const result = await driveClaim(
      submittedDocument({ file: submittedFile({ contentLength: 0 }) })
    )

    expect(result.view.context.errors.file).toBe(FILE_EMPTY_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file whose name resolves to no attachment type, and append nothing', async () => {
    const result = await driveClaim(
      submittedDocument({
        file: submittedFile({ filename: 'certificate-with-no-extension' })
      })
    )

    expect(result.view.context.errors.file).toBe(FILE_TYPE_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file the upload service itself rejected as empty and append nothing', async () => {
    const result = await driveClaim(
      submittedDocument({
        file: submittedFile({
          contentLength: 0,
          hasError: true,
          errorCode: 'FILE_EMPTY'
        })
      })
    )

    expect(result.view.context.errors.file).toBe(FILE_EMPTY_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file the upload service rejected for its type, naming the accepted types', async () => {
    const result = await driveClaim(
      submittedDocument({
        file: submittedFile({
          filename: 'notes.zip',
          hasError: true,
          errorCode: 'FILE_INVALID_TYPE'
        })
      })
    )
    expect(result.view.context.errors.file).toBe(FILE_TYPE_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file the upload service rejected for its size, naming the limit', async () => {
    const result = await driveClaim(
      submittedDocument({
        file: submittedFile({
          filename: 'big.pdf',
          hasError: true,
          errorCode: 'FILE_TOO_LARGE'
        })
      })
    )
    expect(result.view.context.errors.file).toBe(OVERSIZE_FILE_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file the upload service rejected for a reason the page does not know', async () => {
    const result = await driveClaim(
      submittedDocument({
        file: submittedFile({ hasError: true, errorCode: 'FILE_SOMETHING_NEW' })
      })
    )
    expect(result.view.context.errors.file).toBe(
      'The file could not be uploaded. Try again.'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should append nothing for a return whose upload this notification never registered', async () => {
    const found = vi
      .spyOn(documentUploads, 'findByCorrelationId')
      .mockResolvedValue(undefined)

    const result = await driveHandler(get, {
      query: { upload: UNREGISTERED_CORRELATION_ID }
    })

    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
    found.mockRestore()
  })

  it('Should ask the service for nothing when the returning handle is not one the page mints, and offer the add form instead', async () => {
    const found = vi.spyOn(documentUploads, 'findByCorrelationId')

    const result = await driveHandler(get, {
      query: { upload: TRAVERSING_CORRELATION_ID }
    })

    expect(found).not.toHaveBeenCalled()
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.uploadPath).toBeDefined()
    expect(result.after).toEqual(result.before)
    found.mockRestore()
  })

  it('Should append the document once when the same return is replayed', async () => {
    const first = await driveClaim(submittedDocument())
    expect(first.after.documents).toHaveLength(1)

    const replayed = await driveClaim(submittedDocument(), {
      session: first.session,
      seed: { documents: first.after.documents }
    })

    expect(replayed.response.redirect).toBeDefined()
    expect(replayed.after.documents).toHaveLength(1)
  })
})

describe('documents — taking on a returned upload a service refuses', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())
  afterEach(() => vi.restoreAllMocks())

  const NOT_FOUND = 404
  // Pinned as a literal rather than read from the handler, so a reworded line
  // fails here.
  const TAKE_ON_FAILED_MESSAGE = 'Could not take on the returned upload'
  // Registered against the notification but never opened with the upload
  // service, so reading the session it names answers 404.
  const UNOPENED_UPLOAD_ID = 'upload-session-never-opened'

  const claimRefusal = () =>
    Object.assign(
      new Error('Failed to claim document upload: 503 Service Unavailable'),
      { status: SERVICE_UNAVAILABLE }
    )

  it('Should hold the trader on the page with the problem banner when the upload session cannot be read, appending nothing and logging the failure once', async () => {
    const correlationId = randomUUID()
    // Answered here rather than registered through the stub, which scopes a
    // handle to its notification and so needs the journey this drive creates.
    const found = vi
      .spyOn(documentUploads, 'findByCorrelationId')
      .mockResolvedValue({ uploadId: UNOPENED_UPLOAD_ID, correlationId })

    const result = await driveHandler(get, { query: { upload: correlationId } })
    found.mockRestore()

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual(result.before)
    // The add form is still live, so the page says the service failed without
    // also claiming documents cannot be uploaded.
    expect(result.view.context.uploadFormUnavailable).toBe(false)
    expect(summaryTexts(result)).toEqual([])
    expect(errorEntries(result)).toEqual([
      {
        level: 'error',
        fields: {
          err: expect.any(Error),
          status: NOT_FOUND,
          journeyId: result.journeyId,
          uploadId: UNOPENED_UPLOAD_ID,
          correlationId
        },
        message: TAKE_ON_FAILED_MESSAGE
      }
    ])
  })

  it('Should hold the trader on the page with the answers they submitted when the claim is refused, appending nothing and logging the failure once', async () => {
    const refusal = claimRefusal()

    const result = await driveClaim(submittedDocument(), {
      claimError: refusal
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.values.accompanyingDocumentReference).toBe(
      validDocument.accompanyingDocumentReference
    )
    expect(result.after).toEqual(result.before)
    expect(result.view.context.uploadFormUnavailable).toBe(false)
    expect(summaryTexts(result)).toEqual([])
    expect(errorEntries(result)).toHaveLength(1)
    const [logged] = errorEntries(result)
    expect(logged).toEqual({
      level: 'error',
      fields: {
        err: refusal,
        status: SERVICE_UNAVAILABLE,
        journeyId: result.journeyId,
        uploadId: result.session.uploadId,
        correlationId: result.session.correlationId
      },
      message: TAKE_ON_FAILED_MESSAGE
    })
    expect(logged.fields.err).toBe(refusal)
  })

  it('Should hold the trader on the page with the problem banner when saving the taken-on document fails, so a reload tries the save again', async () => {
    const saveFailure = new BackendRequestError('save answers', {
      status: SERVICE_UNAVAILABLE,
      statusText: 'Service Unavailable'
    })
    vi.spyOn(state, 'appendEntry').mockRejectedValue(saveFailure)

    const result = await driveClaim(submittedDocument())

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual(result.before)
    expect(result.view.context.uploadFormUnavailable).toBe(false)
    expect(summaryTexts(result)).toEqual([])
    expect(errorEntries(result)).toHaveLength(1)
    const [logged] = errorEntries(result)
    expect(logged).toEqual({
      level: 'error',
      fields: {
        err: saveFailure,
        journeyId: result.journeyId,
        uploadId: result.session.uploadId,
        correlationId: result.session.correlationId
      },
      message: 'Took on the returned upload but could not save the document'
    })
    expect(logged.fields.err).toBe(saveFailure)
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
    // The tag itself is two or three words with no context, so the hidden
    // label is the only thing telling a screen-reader user which row's check
    // it reports. It sits outside the tag, which the client rewrites in place
    // on a poll, so it survives every status change.
    const result = await driveHandler(get, {
      seed: { documents: [storedDocument()] }
    })
    expect(result.view.context.rows[0][3].html).toBe(
      '<span class="govuk-visually-hidden">Virus check status for GBHC1234567890</span>' +
        '<strong class="govuk-tag govuk-tag--green">Check completed</strong>'
    )
  })

  it('Should escape a document reference before putting it in the hidden label', async () => {
    // The cell is built as HTML, so Nunjucks does not escape it for us and a
    // reference is whatever the trader typed.
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
    const uploadId = await registeredUpload('itahc.pdf')
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

  it('Should block Continue while a scan is PENDING, naming the reason and leaving the add form open', async () => {
    const uploadId = await registeredUpload('itahc.pdf')
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
    expect(result.view.context.uploadFormUnavailable).toBe(false)
    expect(result.view.context.uploadPath).toBeDefined()
  })

  it('Should block Continue while a REJECTED document remains, naming the file', async () => {
    const uploadId = await registeredUpload(VIRUS_NOTES_FILENAME)
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
    expect(result.view.context.rows[0][3].html).toContain('Rejected')
    expect(summaryTexts(result)).toContain(
      'virus-notes.pdf cannot be used. Remove it and try again with a different file.'
    )
  })

  it('Should let the hub exit leave the page while a scan is PENDING', async () => {
    const uploadId = await registeredUpload('itahc.pdf')
    const result = await driveHandler(post, {
      seed: {
        documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
      },
      payload: { action: 'continue', exit: 'hub' }
    })
    expect(result.response.redirect).toBeDefined()
  })

  it('Should remove the named document and its upload session on the remove POST, leaving the others', async () => {
    const uploadId = await registeredUpload('itahc.pdf')
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
    const server = await serverWithDocumentRoutes({ crumb: true })

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

  it('Should refuse a returning upload past the cap with the maximum message and append nothing', async () => {
    const documentsAtCapacity = Array.from({ length: MAX_DOCUMENTS }, () =>
      storedDocument()
    )
    const result = await driveClaim(submittedDocument(), {
      seed: { documents: documentsAtCapacity }
    })
    expect(result.response.statusCode).toBe(400)
    expect(summaryTexts(result)).toContain(
      `You can upload a maximum of ${MAX_DOCUMENTS} files`
    )
    expect(result.after.documents).toHaveLength(MAX_DOCUMENTS)
  })

  it('Should refuse a Continue past the cap with the maximum message, which is the only refusal the page states, and log that refusal once', async () => {
    const documentsAtCapacity = Array.from({ length: MAX_DOCUMENTS }, () =>
      storedDocument()
    )
    const result = await driveHandler(post, {
      seed: { documents: documentsAtCapacity },
      payload: { action: 'continue', ...validDocument }
    })
    expect(result.response.statusCode).toBe(400)
    expect(summaryTexts(result)).toEqual([
      `You can upload a maximum of ${MAX_DOCUMENTS} files`
    ])
    expect(result.view.context.uploadFormUnavailable).toBe(false)
    expect(linesLogged(result, CONTINUE_AT_CAPACITY_LINE)).toEqual([
      {
        level: 'info',
        fields: { journeyId: result.journeyId },
        message: CONTINUE_AT_CAPACITY_LINE
      }
    ])
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

  it('Should keep the reference, the type and the date of issue, ask for the add action on the file and log that refusal once with the field it names, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue', ...validDocument }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.file).toBe(NOT_YET_ADDED_MESSAGE)
    expect(summaryTexts(result)).toContain(NOT_YET_ADDED_MESSAGE)
    expect(result.view.context.values.accompanyingDocumentReference).toBe(
      validDocument.accompanyingDocumentReference
    )
    expect(result.view.context.values.accompanyingDocumentType).toBe(
      validDocument.accompanyingDocumentType
    )
    expect(result.view.context.values.accompanyingDocumentDateOfIssue).toEqual({
      day: '12',
      month: '12',
      year: '2025'
    })
    expect(result.after).toEqual(result.before)
    expect(linesLogged(result, CONTINUE_NOT_ADDED_LINE)).toEqual([
      {
        level: 'info',
        fields: { journeyId: result.journeyId, fields: ['file'] },
        message: CONTINUE_NOT_ADDED_LINE
      }
    ])
  })

  it('Should not claim a file was chosen when Continue asks for the add action', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue', ...validDocument }
    })
    expect(result.view.context.errors.file).not.toMatch(/you chose/i)
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

  it('Should keep a reference and a date typed with no type chosen, and ask for the type, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'continue',
        accompanyingDocumentReference: 'GBHC1234567890',
        accompanyingDocumentDateOfIssue: DATE_OF_ISSUE_TEXT
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.errors.accompanyingDocumentType).toBe(
      TYPE_REQUIRED_MESSAGE
    )
    expect(result.view.context.values.accompanyingDocumentReference).toBe(
      'GBHC1234567890'
    )
    expect(result.view.context.values.accompanyingDocumentDateOfIssue).toEqual({
      day: '12',
      month: '12',
      year: '2025'
    })
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a Continue whose type the page never offered rather than carry it past, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'continue',
        ...validDocument,
        accompanyingDocumentType: UNOFFERED_TYPE
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.errors.accompanyingDocumentType).toBe(
      TYPE_REQUIRED_MESSAGE
    )
    expect(result.after).toEqual(result.before)
  })

  // Uploading is optional, so a form the trader never touched still goes with
  // the page. This is the behaviour the refusals above must not swallow.
  it('Should carry an untouched form past the page, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue' }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should leave a part-filled form behind on the exit to the overview, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: { exit: 'hub', ...validDocument }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
  })
})

describe('documents — scan-status poll and view context', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  it('Should serve the scan statuses the client polls, keyed by upload id', async () => {
    const uploadId = await registeredUpload('itahc.pdf')
    const result = await driveHandler(statusRoute.handler, {
      seed: {
        documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
      }
    })
    expect(result.response.payload.documents).toEqual([
      { uploadId, scanStatus: 'COMPLETE' }
    ])
  })

  it('Should treat an unreadable scan status as pending and log it against the upload', async () => {
    const uploadId = await registeredUpload('itahc.pdf')
    const err = Object.assign(
      new Error(
        'Failed to get document upload status: 500 Internal Server Error'
      ),
      { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
    )
    const read = vi.spyOn(documentUploads, 'scanStatus').mockRejectedValue(err)

    try {
      const result = await driveHandler(statusRoute.handler, {
        seed: {
          documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
        }
      })

      expect(result.response.payload.documents).toEqual([
        { uploadId, scanStatus: 'PENDING' }
      ])
      expect(
        result.logger.entries.filter(({ level }) => level === 'warn')
      ).toEqual([
        {
          level: 'warn',
          fields: {
            err,
            status: HTTP_STATUS_INTERNAL_SERVER_ERROR,
            journeyId: result.journeyId,
            uploadId
          },
          message:
            'Could not read the document scan status, treating it as pending'
        }
      ])
    } finally {
      read.mockRestore()
    }
  })

  it('Should settle a pending scan through the poll leg, as the refresh link does', async () => {
    const uploadId = await registeredUpload('itahc.pdf')
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
    const uploadId = await registeredUpload('virus.pdf')
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
    const uploadId = await registeredUpload('itahc.pdf')
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

  it('Should hand the view the document limit the hint states, straight from the obligation', async () => {
    // The hint and the too-many error must name the same number. The view gets
    // it from the same contract the error does, so raising the obligation's
    // maxEntries moves both at once.
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
        text: 'Rejected',
        classes: 'govuk-tag--red',
        announcement:
          'Document check failed: the file cannot be used. Remove it and try again.'
      },
      PENDING: { text: TAG_SCANNING, classes: 'govuk-tag--blue' },
      UNKNOWN: { text: 'Unknown', classes: 'govuk-tag--grey' }
    })
  })

  it('Should offer View file only once a scan has settled clean, alongside Remove', async () => {
    const uploadId = await registeredUpload('itahc.pdf')
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

  it('Should register the POST route with no multipart parsing and no payload cap of its own', async () => {
    const server = await serverWithDocumentRoutes()
    const route = server.table().find((entry) => entry.method === 'post')
    expect(route.settings.payload.multipart).toBeFalsy()
    expect(route.settings.payload.maxBytes).toBe(await uncappedRouteMaxBytes())
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
    const uploadId = await registeredUpload('itahc.pdf')
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
    const uploadId = await registeredUpload('itahc.pdf')
    const held = await journeyHolding(uploadId)

    const response = await readFile(held, 'somebody-elses-upload-id')

    expect(response.statusCode).toBe(404)
  })

  it("Should not expose journey A's upload through journey B's URL in one session", async () => {
    const uploadId = await registeredUpload('itahc.pdf')
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
    const uploadId = await registeredUpload('itahc.pdf')
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

describe('documents — the add form when no upload session can be opened', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  const environment = nunjucksConfig.options.compileOptions.environment
  // Pinned as a literal rather than read from copy, so a reworded or reused
  // message fails here.
  const UPLOAD_UNAVAILABLE_MESSAGE =
    'Documents cannot be uploaded at the moment. Reload the page or come back later.'

  const uploaderError = () =>
    Object.assign(
      new Error('Failed to open an upload session: 503 Service Unavailable'),
      { status: SERVICE_UNAVAILABLE }
    )

  const pageOf = ({ view: { view, context } }) =>
    load(
      environment.render(`${view}.njk`, {
        ...context,
        userSession: { isAuthenticated: true, displayName: 'Sam Example' },
        getAssetPath: (asset) => `/assets/${asset}`
      })
    )

  it('Should log the ids of a session it opened but could not record against the notification, and still refuse only the add form', async () => {
    const err = Object.assign(
      new Error('Failed to register document upload: 503 Service Unavailable'),
      { status: SERVICE_UNAVAILABLE }
    )
    const register = vi
      .spyOn(documentUploads, 'register')
      .mockRejectedValue(err)
    const unrecorded =
      'Could not record the upload session against the notification'

    try {
      const result = await driveHandler(get)

      expect(result.view.context.uploadFormUnavailable).toBe(true)
      expect(
        result.logger.entries.filter(({ message }) => message === unrecorded)
      ).toEqual([
        {
          level: 'error',
          fields: {
            err,
            status: SERVICE_UNAVAILABLE,
            journeyId: result.journeyId,
            uploadId: expect.any(String),
            correlationId: expect.any(String)
          },
          message: unrecorded
        }
      ])
    } finally {
      register.mockRestore()
    }
  })

  it('Should refuse the add form with its reason above a still-focusable button, name that reason in the error summary, keep the saved documents and log the failure', async () => {
    const err = uploaderError()
    const open = vi.spyOn(documentUploadSessions, 'open').mockRejectedValue(err)
    const saved = storedDocument()

    try {
      const result = await driveHandler(get, { seed: { documents: [saved] } })

      expect(result.response.statusCode).toBe(200)
      expect(result.view.context.uploadFormUnavailable).toBe(true)
      expect(result.view.context.uploadPath).toBeUndefined()
      expect(summaryTexts(result)).toContain(UPLOAD_UNAVAILABLE_MESSAGE)
      expect(
        result.logger.entries.filter(({ level }) => level === 'error')
      ).toEqual([
        {
          level: 'error',
          fields: {
            err,
            status: SERVICE_UNAVAILABLE,
            journeyId: result.journeyId
          },
          message: 'Could not open an upload session'
        }
      ])

      const $ = pageOf(result)
      const addButton = $('button[name="action"][value="add"]')
      expect(addButton.attr('formaction')).toBeUndefined()
      expect(addButton.attr('formenctype')).toBeUndefined()
      expect(addButton.attr('disabled')).toBeUndefined()
      expect(addButton.attr('aria-disabled')).toBe('true')
      expect(`#${addButton.attr('id')}`).toBe(ADD_DOCUMENT_ANCHOR)

      const reason = $(`#${addButton.attr('aria-describedby')}`)
      expect(reason.text()).toContain(UPLOAD_UNAVAILABLE_MESSAGE)
      expect(reason.next().attr('id')).toBe(addButton.attr('id'))

      const summaryLink = $('.govuk-error-summary')
        .find('a')
        .filter(
          (_, link) => $(link).text().trim() === UPLOAD_UNAVAILABLE_MESSAGE
        )
      expect(summaryLink.attr('href')).toBe(ADD_DOCUMENT_ANCHOR)

      expect($('#documents-added').text()).toContain(
        saved.accompanyingDocumentReference
      )
    } finally {
      open.mockRestore()
    }
  })

  // Pressing the refused button is still reachable from the keyboard, and the
  // add step it would ask for is the one that cannot be taken.
  it('Should state only the upload failure when Continue carries a document and no session can be opened, keeping the answers', async () => {
    const open = vi
      .spyOn(documentUploadSessions, 'open')
      .mockRejectedValue(uploaderError())

    try {
      const result = await driveHandler(post, {
        payload: { action: 'continue', ...validDocument }
      })

      expect(result.response.statusCode).toBe(400)
      expect(summaryTexts(result)).toEqual([UPLOAD_UNAVAILABLE_MESSAGE])
      expect(result.view.context.values.accompanyingDocumentReference).toBe(
        validDocument.accompanyingDocumentReference
      )
      expect(result.after).toEqual(result.before)
    } finally {
      open.mockRestore()
    }
  })
})

describe('documents — a removal the backend cannot save', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())
  afterEach(() => vi.restoreAllMocks())

  // Pinned as literals rather than read from the controller, so a reworded
  // line fails here.
  const REMOVAL_SAVE_FAILED_LINE =
    'Removed the upload but could not save the document removal'
  const RETRIED_REMOVAL_SAVE_FAILED_LINE =
    'Could not save the retried document removal'

  it('Should hold the trader on the page with the problem banner when a removal cannot be saved, delete nothing and log it once with the journey and the upload', async () => {
    const refusal = backendRefusal()
    vi.spyOn(state, 'removeEntry').mockRejectedValue(refusal)
    const uploadId = await registeredUpload(PDF_FILENAME)
    const seed = {
      documents: [storedDocument({ uploadId, filename: PDF_FILENAME })]
    }

    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove:0' }
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual(seed)
    expect(errorEntries(result)).toEqual([
      {
        level: 'error',
        fields: { err: refusal, journeyId: result.journeyId, uploadId },
        message: REMOVAL_SAVE_FAILED_LINE
      }
    ])
  })

  it('Should hold the trader on the page with the problem banner when the retried removal cannot be saved, and log that failure once', async () => {
    const refusal = backendRefusal()
    vi.spyOn(state, 'commit').mockRejectedValue(refusal)
    const seed = { documents: [storedDocument()] }

    const result = await driveHandler(post, {
      seed,
      payload: { retryRemoveUploadId: 'upload-session-1' }
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual(seed)
    expect(errorEntries(result)).toEqual([
      {
        level: 'error',
        fields: {
          err: refusal,
          journeyId: result.journeyId,
          uploadId: 'upload-session-1'
        },
        message: RETRIED_REMOVAL_SAVE_FAILED_LINE
      }
    ])
  })
})

describe('documents — the add form on a notification at its cap', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  const atCapacity = () => ({
    documents: Array.from({ length: MAX_DOCUMENTS }, () => storedDocument())
  })

  it('Should close the add form, so no file is uploaded only to be refused', async () => {
    const result = await driveHandler(get, { seed: atCapacity() })

    expect(result.view.context.addFormClosed).toBe(true)
    expect(result.view.context.addFormClosedReason).toBe(
      `You can upload a maximum of ${MAX_DOCUMENTS} files`
    )
    // The session still opened — the form is closed on capacity, not on a
    // failure to reach the upload service.
    expect(result.view.context.uploadFormUnavailable).toBe(false)
  })

  it('Should render the add button with no formaction, so it cannot post a file to the upload service', async () => {
    const environment = nunjucksConfig.options.compileOptions.environment

    const { view } = await driveHandler(get, { seed: atCapacity() })
    const page = load(
      environment.render(`${view.view}.njk`, {
        ...view.context,
        userSession: { isAuthenticated: true, displayName: 'Sam Example' },
        getAssetPath: (asset) => `/assets/${asset}`
      })
    )

    const addButton = page('#add-document')
    expect(addButton.attr('formaction')).toBeUndefined()
    expect(addButton.attr('aria-disabled')).toBe('true')
  })
})
