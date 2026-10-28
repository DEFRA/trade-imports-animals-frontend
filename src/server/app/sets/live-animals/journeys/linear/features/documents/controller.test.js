import { randomUUID } from 'node:crypto'
import { SET_BASE, SET_ID } from '../../../../set.js'
import Crumb from '@hapi/crumb'
import Hapi from '@hapi/hapi'
import {
  documentOf,
  trimmedTextOf
} from '../../../../../../../common/test-helpers/document-of.js'
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
import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import {
  CYA_SLUG,
  REFUSAL_LOG_MESSAGE,
  SURFACES
} from '../../../../../../shared/kit.js'
import { store } from '../../../../../../engine/store.js'
import {
  knownJourneysCookie,
  registerJourneyCookie
} from '../../../../../../engine/journey.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { BackendRequestError } from '../../../../../../services/persistence/records/errors.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  getHandlerOf,
  expectBackLinkIsPage,
  expectOneLogged,
  postHandlerOf,
  registerTestRequestLogger,
  registerTestSessionAuth,
  saveFallbackEntry,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import { documentUploads } from '../../../../../../services/document-uploads/index.js'
import { documentUploadSessions } from '../../../../../../services/cdp-uploader/index.js'
import { recordSubmittedUpload } from '../../../../../../services/cdp-uploader/stub.js'
import { UPLOAD_SCANNING } from '../../../../../../services/cdp-uploader/upload-statuses.js'
import { dispatchPages } from '../index.js'

import * as documents from './controller.js'
import { ADD_DOCUMENT_ANCHOR } from './contracts/add-document-anchor.js'
import { addDocumentSubmission, driveReturnFromUpload } from './test-support.js'
import { copy } from './copy/copy.en.js'
import { MAX_DOCUMENTS } from './contracts/max-documents.js'
import { REFERENCE_MAX_LENGTH } from '../../../../../../services/document-uploads/claim-contract.js'
import { documents as manifestDocuments } from '../../../../obligations/index.js'
import {
  ALLOWED_MIME_TYPES,
  fileTypeMessage,
  MAX_FILE_SIZE_BYTES,
  oversizeMessage
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
const get = getHandlerOf(documents)

const environment = nunjucksConfig.options.compileOptions.environment

const renderedPageOf = ({ view: { view, context } }) =>
  documentOf(
    environment.render(`${view}.njk`, {
      ...context,
      userSession: { isAuthenticated: true, displayName: 'Sam Example' },
      getAssetPath: (asset) => `/assets/${asset}`
    })
  )
const statusRoute = documents.routes.find((route) =>
  route.path.endsWith('/status')
)
const fileRoute = documents.routes.find((route) => route.path.endsWith('/file'))

const PDF_FILENAME = 'itahc-certificate.pdf'

const DOCUMENTS_SLUG = 'accompanying-documents'
const UNHELD_UPLOAD_ID = 'somebody-elses-upload-id'
const DATE_OF_ISSUE_TEXT = '12/12/2025'
// Pinned as literals rather than read from copy, so a rewording fails a test.
const TAG_SCANNING = 'Scanning for virus'
const TAG_COMPLETE = 'Check completed'
const TAG_REJECTED = 'Rejected'
const REFUSED_TAG_CLASSES = 'govuk-tag--red'
const TAG_VIRUS_FOUND = 'Virus found'
const TAG_UPLOAD_FAILED = 'Upload failed'
const TAG_DOWNLOAD_FAILED = 'Download failed'
const FILE_REQUIRED_MESSAGE = 'Upload a document'
const FILE_EMPTY_MESSAGE = 'The selected file is empty'
const CONTINUE_AT_CAPACITY_LINE =
  'Continue refused: the notification is at its document capacity'
const UPLOAD_SESSION_OPENED_LINE = 'Upload session opened'
const DOCUMENT_NOT_SAVED_BANNER =
  'Sorry, there is a problem with the service. Your document was uploaded but has not been saved to this notification. Select ‘Save and continue’ to try again.'
const DOCUMENTS_UNCHECKED_BANNER =
  'Sorry, there is a problem with the service. We could not check that every document you uploaded is saved to this notification. Select ‘Save and continue’ to try again.'
const TYPE_REQUIRED_MESSAGE = 'Select a document type'
const VIRUS_NOTES_FILENAME = 'virus-notes.pdf'
const UNOFFERED_TYPE = 'NOT_A_DOCUMENT_TYPE'
const WITHHELD_TYPE = 'HEALTH_CERTIFICATE'
const OFFERED_DOCUMENT_TYPE_CODES = [
  'ITAHC',
  'VETERINARY_HEALTH_CERTIFICATE',
  'AIR_WAYBILL',
  'IMPORT_PERMIT',
  'LETTER_OF_AUTHORITY',
  'COMMERCIAL_INVOICE',
  'SEA_WAYBILL',
  'RAIL_WAYBILL',
  'BILL_OF_LADING',
  'CATCH_CERTIFICATE',
  'LABORATORY_SAMPLING_RESULTS_FOR_AFLATOXIN',
  'JOURNEY_LOG',
  'OTHER'
]

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

const documentsAtCapacity = () => ({
  documents: Array.from({ length: MAX_DOCUMENTS }, () => storedDocument())
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
 * back from it. The read is stood in for so a test can hand the page a file entry the stand-in
 * will not produce — a code it does not model, or a scan verdict it reaches no other way.
 * A case the stand-in can judge for itself belongs in `driveClaimThroughUploadService`.
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
      query: { ...options.query, upload: correlationId }
    })
    return { ...result, session: { journeyId, correlationId, uploadId } }
  } finally {
    read.mockRestore()
    claim?.mockRestore()
  }
}

/**
 * Drives the claim leg with nothing stood in for: the submitted form is recorded against the
 * session by the stand-in upload service, which judges the file by the limits the session was
 * opened with, and the page reads it back through the real session read.
 *
 * @param {object} payload - the submitted fields, `file` as hapi's annotated multipart entry
 * @param {object} [options] - `driveHandler` options
 * @returns {Promise<object>} what `driveHandler` reports, plus the `session` it drove
 */
const driveClaimThroughUploadService = async (payload, options = {}) => {
  const { journeyId, correlationId, uploadId } = await registeredSession(
    (await store.create()).journeyId
  )
  recordSubmittedUpload(uploadId, payload)
  const result = await driveHandler(get, {
    ...options,
    journeyId,
    query: { upload: correlationId }
  })
  return { ...result, session: { journeyId, correlationId, uploadId } }
}

const uploadedPart = ({
  filename,
  contentType = 'application/pdf',
  bytes
}) => ({
  filename,
  headers: { 'content-type': contentType },
  payload: Buffer.alloc(bytes, 1)
})

const submittedDocument = (overrides = {}) => ({
  ...validDocument,
  action: 'add',
  file: submittedFile(),
  ...overrides
})

const SAVE_AND_CONTINUE = { action: 'continue' }
const SAVE_AND_CONTINUE_LABEL = 'Save and continue'
const SAVE_AND_RETURN_TO_OVERVIEW = { action: 'continue', exit: 'hub' }
const SAVE_AND_RETURN_TO_OVERVIEW_LABEL = 'Save and return to overview'
const AMEND_SAVE_AND_RETURN = { amendSave: 'return' }

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

const SAVE_ANSWERS = 'save answers'

const summaryTexts = (result) =>
  (result.view.context.errorSummary?.errorList ?? []).map((item) => item.text)

const linesLogged = (result, message) =>
  result.logger.entries.filter((entry) => entry.message === message)

const errorEntries = ({ logger }) =>
  logger.entries.filter(({ level }) => level === 'error')

const SERVICE_UNAVAILABLE = 503

const backendRefusal = (operation = 'save answers') =>
  new BackendRequestError(operation, {
    status: SERVICE_UNAVAILABLE,
    statusText: 'Service Unavailable'
  })

const configureEngine = () => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
}

const expectContinueRefusedLogged = (result, rejectedScans) =>
  expect(result.logger.entries).toContainEqual({
    level: 'info',
    message: REFUSAL_LOG_MESSAGE,
    fields: expect.objectContaining({
      journeyId: result.journeyId,
      errorCodes: ['documents'],
      rejectedScans
    })
  })

describe('documents — taking on an upload the browser returns with', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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
    const fieldOrder = [
      'accompanyingDocumentReference',
      'accompanyingDocumentType',
      'accompanyingDocumentDateOfIssue',
      'file'
    ]
    expect(Object.keys(result.view.context.errors)).toEqual(fieldOrder)
    expect(result.view.context.errors.file).toBe(oversizeMessage(copy))
    expect(result.logger.entries.map(({ message }) => message)).toEqual([
      UPLOAD_SESSION_OPENED_LINE
    ])
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

  it('Should refuse a document type the backend holds but the page withholds, and append nothing', async () => {
    const result = await driveClaim(
      submittedDocument({ accompanyingDocumentType: WITHHELD_TYPE })
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

describe('documents — leaving the page by the save choice a returned upload carries', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const completeDocument = (choice) =>
    submittedDocument({ action: null, ...choice })

  it.each([
    [
      SAVE_AND_RETURN_TO_OVERVIEW_LABEL,
      SAVE_AND_RETURN_TO_OVERVIEW,
      {},
      (journeyId) => hubPath(journeyId)
    ],
    [
      SAVE_AND_CONTINUE_LABEL,
      SAVE_AND_CONTINUE,
      {},
      (journeyId) => hubPath(journeyId)
    ],
    [
      'the amend Save and return',
      AMEND_SAVE_AND_RETURN,
      { query: { change: '1' }, amend: true },
      (journeyId) => pagePath(journeyId, CYA_SLUG)
    ],
    [
      'the amend Save and continue',
      SAVE_AND_CONTINUE,
      { query: { change: '1' }, amend: true },
      (journeyId) => hubPath(journeyId)
    ]
  ])(
    'Should append the returned document once and redirect to where %s leads',
    async (_choiceLabel, choice, requestOptions, expectedRedirect) => {
      const result = await driveClaim(completeDocument(choice), requestOptions)

      expect(result.response).toEqual({
        redirect: expectedRedirect(result.journeyId)
      })
      expect(result.after.documents).toEqual([
        expect.objectContaining({
          uploadId: result.session.uploadId,
          accompanyingDocumentReference:
            validDocument.accompanyingDocumentReference
        })
      ])
    }
  )

  it('Should append nothing and redirect to the overview for an untouched form returned with Save and return to overview, logging the unclaimed return once', async () => {
    const result = await driveClaim(SAVE_AND_RETURN_TO_OVERVIEW)

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after).toEqual(result.before)
    expect(
      linesLogged(
        result,
        'Returned upload left unclaimed: no document was started'
      )
    ).toEqual([
      {
        level: 'info',
        fields: {
          journeyId: result.journeyId,
          uploadId: result.session.uploadId,
          correlationId: result.session.correlationId,
          saveChoice: { hubExit: true, change: false }
        },
        message: 'Returned upload left unclaimed: no document was started'
      }
    ])
  })

  it('Should append nothing and redirect to the overview for an untouched form returned with Save and continue', async () => {
    const result = await driveClaim(SAVE_AND_CONTINUE)

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after).toEqual(result.before)
  })

  it('Should redirect an untouched form returned at the cap with Save and return to overview to the overview, appending nothing', async () => {
    const result = await driveClaim(SAVE_AND_RETURN_TO_OVERVIEW, {
      seed: documentsAtCapacity()
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.documents).toHaveLength(MAX_DOCUMENTS)
  })

  it('Should refuse an untouched form returned with Save and add another, naming every missing detail', async () => {
    const result = await driveClaim({ action: 'add' })

    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(Object.keys(result.view.context.errors)).toEqual([
      'accompanyingDocumentReference',
      'accompanyingDocumentType',
      'accompanyingDocumentDateOfIssue',
      'file'
    ])
    expect(result.after).toEqual(result.before)
  })

  it('Should send an untouched form returned with Save and continue from a page opened with a Change link to the review when the notification is not being amended', async () => {
    const result = await driveClaim(SAVE_AND_CONTINUE, {
      query: { change: '1' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, CYA_SLUG)
    })
  })

  it('Should send an untouched form returned with the amend Save and return from a page opened with a Change link to the review', async () => {
    const result = await driveClaim(AMEND_SAVE_AND_RETURN, {
      query: { change: '1' },
      amend: true
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, CYA_SLUG)
    })
  })

  it('Should send an untouched form returned with the amend Save and continue from a page opened with a Change link to the overview', async () => {
    const result = await driveClaim(SAVE_AND_CONTINUE, {
      query: { change: '1' },
      amend: true
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
  })

  it('Should ask for the document type when a reference, a date and a file arrive without one, appending nothing', async () => {
    const result = await driveClaim(
      submittedDocument({
        ...SAVE_AND_CONTINUE,
        accompanyingDocumentType: ''
      })
    )

    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.errors).toEqual({
      accompanyingDocumentType: TYPE_REQUIRED_MESSAGE
    })
    expect(result.after).toEqual(result.before)
  })

  it.each([
    [
      'only a date of issue',
      { accompanyingDocumentDateOfIssue: DATE_OF_ISSUE_TEXT }
    ],
    [
      'only a type the page never offered',
      { accompanyingDocumentType: UNOFFERED_TYPE }
    ]
  ])(
    'Should count a returned form carrying %s as started and refuse it, appending nothing',
    async (_title, fields) => {
      const result = await driveClaim({ ...SAVE_AND_CONTINUE, ...fields })

      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.view.context.errors.file).toBe(FILE_REQUIRED_MESSAGE)
      expect(result.after).toEqual(result.before)
    }
  )
})

describe('documents — the Back link', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should go Back to the review when the page was opened by changing an answer from the review', async () => {
    const result = await driveHandler(get, { query: { change: '1' } })

    expectBackLinkIsPage(result, CYA_SLUG)
  })

  it('Should go Back to the review while the notification is being amended, with nothing in the address saying where the trader came from', async () => {
    const result = await driveHandler(get, { amend: true })

    expectBackLinkIsPage(result, CYA_SLUG)
  })

  it('Should go Back to the overview when the page is opened from the overview on a draft', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })

  it('Should keep the review back link after the page refuses a part-filled document returned from the upload service', async () => {
    const result = await driveReturnFromUpload({
      submission: validDocument,
      query: { change: '1' }
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.errors.file).toBe(FILE_REQUIRED_MESSAGE)
    expectBackLinkIsPage(result, CYA_SLUG)
  })
})

describe('documents — refusing an upload the browser returns with', () => {
  it('Should refuse a return whose session holds no file entry and append nothing', async () => {
    const result = await driveClaimThroughUploadService({ ...validDocument })

    expect(result.view.context.errors.file).toBe(FILE_REQUIRED_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file the upload service took but which carries no bytes, and append nothing', async () => {
    const result = await driveClaimThroughUploadService({
      ...validDocument,
      file: uploadedPart({ filename: PDF_FILENAME, bytes: 0 })
    })
    expect(result.view.context.errors.file).toBe(FILE_EMPTY_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should take on a file the upload service judged good, reading the session for real', async () => {
    const result = await driveClaimThroughUploadService({
      ...validDocument,
      action: 'add',
      file: uploadedPart({ filename: 'itahc.pdf', bytes: 8 })
    })

    expect(result.response.redirect).toBeDefined()
    const [entry] = result.after.documents
    expect(entry.filename).toBe('itahc.pdf')
    expect(entry.accompanyingDocumentAttachmentType).toBe('PDF')
    expect(entry.uploadId).toBe(result.session.uploadId)
  })

  it('Should refuse a file whose name resolves to no attachment type, and append nothing', async () => {
    const result = await driveClaim(
      submittedDocument({
        file: submittedFile({ filename: 'certificate-with-no-extension' })
      })
    )

    expect(result.view.context.errors.file).toBe(fileTypeMessage(copy))
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
    expect(result.view.context.errors.file).toBe(fileTypeMessage(copy))
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
    expect(result.view.context.errors.file).toBe(oversizeMessage(copy))
    expect(result.after).toEqual(result.before)
  })

  it('Should name the virus when the upload service found one, rather than inviting a retry', async () => {
    const result = await driveClaim(
      submittedDocument({
        file: submittedFile({
          filename: 'eicar.pdf',
          hasError: true,
          errorCode: 'FILE_VIRUS'
        })
      })
    )
    expect(result.view.context.errors.file).toBe(
      'The selected file contains a virus'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file the upload service could not download, rather than inviting a retry', async () => {
    const result = await driveClaim(
      submittedDocument({
        file: submittedFile({
          filename: 'certificate.pdf',
          hasError: true,
          errorCode: 'FILE_DOWNLOAD_FAILED'
        })
      })
    )
    expect(result.view.context.errors.file).toBe(
      'The selected file could not be downloaded'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file the upload service rejected for a reason the page does not know', async () => {
    const result = await driveClaim(
      submittedDocument({
        file: submittedFile({ hasError: true, errorCode: 'FILE_SOMETHING_NEW' })
      })
    )
    expect(result.view.context.errors.file).toBe(
      'The selected file could not be uploaded. Try again.'
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
  const TAKE_ON_FAILED_MESSAGE = 'Could not take on the returned upload'
  // Registered against the notification but never opened with the upload
  // service, so reading the session it names answers 404.
  const UNOPENED_UPLOAD_ID = 'upload-session-never-opened'

  const expectHeldOnPageWithProblemBanner = (result) => {
    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual(result.before)
    expect(result.view.context.uploadFormUnavailable).toBe(false)
    expect(summaryTexts(result)).toEqual([])
  }

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

    expectHeldOnPageWithProblemBanner(result)
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

    expectHeldOnPageWithProblemBanner(result)
    expect(result.view.context.values.accompanyingDocumentReference).toBe(
      validDocument.accompanyingDocumentReference
    )
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

  it('Should hold the trader on the page with the problem banner when saving the taken-on document fails, appending nothing and logging the failure once', async () => {
    const saveFailure = backendRefusal()

    const result = await driveClaim(submittedDocument(), { saveFailure })

    expectHeldOnPageWithProblemBanner(result)
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

  it('Should say the document was not saved to the notification, rather than that the answers were saved', async () => {
    const result = await driveClaim(submittedDocument(), {
      saveFailure: backendRefusal()
    })

    expect(result.view.context.recoverableErrorBody).toBe(
      DOCUMENT_NOT_SAVED_BANNER
    )
  })

  it('Should carry the handle the next save takes the upload on again by', async () => {
    const result = await driveClaim(submittedDocument(), {
      saveFailure: backendRefusal()
    })

    expect(result.view.context.unsavedDocument).toEqual({
      uploadId: result.session.uploadId,
      correlationId: result.session.correlationId
    })
  })
})

describe('documents — saving a document the service has taken on', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())
  afterEach(() => vi.restoreAllMocks())

  const RETRY_TAKE_ON_LINE =
    'Taking on the returned upload again, to save the document it was taken on for'

  /** A session registered against the notification, uploaded through and claimed. */
  const takenOnUpload = async (journeyId) => {
    const session = await registeredSession(journeyId)
    recordSubmittedUpload(session.uploadId, {
      ...validDocument,
      action: 'add',
      file: uploadedPart({ filename: PDF_FILENAME, bytes: 8 })
    })
    await documentUploads.claim({
      uploadId: session.uploadId,
      documentType: validDocument.accompanyingDocumentType,
      documentReference: validDocument.accompanyingDocumentReference,
      dateOfIssue: '2025-12-12'
    })
    return session
  }

  it('Should save the document on the next save, and leave the trader on the page it was added from', async () => {
    const journey = await store.create()
    const session = await takenOnUpload(journey.journeyId)

    const result = await driveHandler(post, {
      journeyId: journey.journeyId,
      payload: { retryAddCorrelationId: session.correlationId }
    })

    expect(result.response.redirect).toBeDefined()
    expect(result.after.documents).toEqual([
      expect.objectContaining({
        uploadId: session.uploadId,
        accompanyingDocumentReference:
          validDocument.accompanyingDocumentReference
      })
    ])
    expect(linesLogged(result, RETRY_TAKE_ON_LINE)).toEqual([
      {
        level: 'info',
        fields: {
          journeyId: journey.journeyId,
          correlationId: session.correlationId
        },
        message: RETRY_TAKE_ON_LINE
      }
    ])
  })

  it('Should refuse Continue while the notification does not list a document the service has taken on, naming it in the line it logs', async () => {
    const journey = await store.create()
    const session = await takenOnUpload(journey.journeyId)

    const result = await driveHandler(post, {
      journeyId: journey.journeyId,
      payload: { action: 'continue' }
    })

    expect(result.response.redirect).toBeUndefined()
    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.recoverableErrorBody).toBe(
      DOCUMENT_NOT_SAVED_BANNER
    )
    expect(result.view.context.unsavedDocument).toEqual({
      uploadId: session.uploadId,
      correlationId: session.correlationId
    })
    expect(result.logger.entries).toContainEqual({
      level: 'info',
      message: REFUSAL_LOG_MESSAGE,
      fields: expect.objectContaining({
        journeyId: journey.journeyId,
        reason: 'document-taken-on-but-not-listed',
        uploadId: session.uploadId,
        correlationId: session.correlationId
      })
    })
  })

  it('Should carry Continue past the page when the notification lists the document the service has taken on', async () => {
    const journey = await store.create()
    const session = await takenOnUpload(journey.journeyId)

    const result = await driveHandler(post, {
      journeyId: journey.journeyId,
      seed: { documents: [storedDocument({ uploadId: session.uploadId })] },
      payload: { action: 'continue' }
    })

    expect(result.response.redirect).toBeDefined()
    expect(result.view).toBeUndefined()
  })

  it('Should refuse Continue when the documents the service holds cannot be read, logging the failure once', async () => {
    const unreadable = backendRefusal('list document uploads')
    vi.spyOn(documentUploads, 'listByNotification').mockRejectedValue(
      unreadable
    )

    const result = await driveHandler(post, {
      payload: { action: 'continue' }
    })

    expect(result.response.redirect).toBeUndefined()
    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.recoverableErrorBody).toBe(
      DOCUMENTS_UNCHECKED_BANNER
    )
    expect(errorEntries(result)).toEqual([
      {
        level: 'error',
        fields: {
          err: unreadable,
          status: SERVICE_UNAVAILABLE,
          journeyId: result.journeyId
        },
        message:
          'Could not read the documents the service has taken on for this notification'
      }
    ])
  })

  it('Should answer Continue as Continue when the retry handle is not one this service issues', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'continue',
        ...validDocument,
        retryAddCorrelationId: TRAVERSING_CORRELATION_ID
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.file).toBe(FILE_REQUIRED_MESSAGE)
    expect(result.after).toEqual(result.before)
  })
})

describe('documents — listing, scanning and removing', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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

  it('Should label a document recorded as Health certificate with that type while the select offers thirteen', async () => {
    const result = await driveHandler(get, {
      seed: {
        documents: [
          storedDocument({ accompanyingDocumentType: 'HEALTH_CERTIFICATE' })
        ]
      }
    })

    expect(result.view.context.rows[0][1].text).toBe('Health certificate')
    expect(
      result.view.context.documentTypeItems.slice(1).map(({ value }) => value)
    ).toEqual(OFFERED_DOCUMENT_TYPE_CODES)
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

  it.each([
    [SAVE_AND_CONTINUE_LABEL, { action: 'continue' }],
    [SAVE_AND_RETURN_TO_OVERVIEW_LABEL, { action: 'continue', exit: 'hub' }]
  ])(
    'Should let %s leave the page while a scan is PENDING',
    async (_button, payload) => {
      const uploadId = await registeredUpload('itahc.pdf')
      const result = await driveHandler(post, {
        seed: {
          documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
        },
        payload
      })
      expect(result.response.redirect).toBeDefined()
      expect(result.view).toBeUndefined()
    }
  )

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
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.rows[0][3].html).toContain(TAG_VIRUS_FOUND)
    expect(summaryTexts(result)).toContain(
      'virus-notes.pdf cannot be used. Remove it and try again with a different file.'
    )
    expectContinueRefusedLogged(result, [
      { uploadId, scanStatus: 'REJECTED', tagKey: 'REJECTED_FILE_VIRUS' }
    ])
  })
})

describe('documents — removing one, and the document cap', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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

  it('Should refuse a returning upload past the cap with the maximum message, linked to the documents it already holds, and append nothing', async () => {
    const result = await driveClaim(submittedDocument(), {
      seed: documentsAtCapacity()
    })
    expect(result.response.statusCode).toBe(400)
    const limitMessage = `You can upload a maximum of ${MAX_DOCUMENTS} files`
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: limitMessage, href: '#documents-added' }
    ])
    expect(result.after.documents).toHaveLength(MAX_DOCUMENTS)
  })

  it('Should refuse a Continue past the cap with the maximum message, which is the only refusal the page states, and log that refusal once', async () => {
    const result = await driveHandler(post, {
      seed: documentsAtCapacity(),
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

describe('documents — every save button finishes or refuses a part-filled document', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should carry an untouched form past the page, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue' }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should show the reference, the type and the date of issue as typed, ask for the file and log nothing for the refusal, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue', ...validDocument }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.file).toBe(FILE_REQUIRED_MESSAGE)
    expect(summaryTexts(result)).toContain(FILE_REQUIRED_MESSAGE)
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
    expect(result.logger.entries.map(({ message }) => message)).toEqual([
      UPLOAD_SESSION_OPENED_LINE
    ])
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

  it('Should show a reference and a date typed with no type chosen, and ask for the type, appending nothing', async () => {
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

  it('Should refuse a part-filled form on the exit to the overview, naming each missing detail and appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        ...SAVE_AND_RETURN_TO_OVERVIEW,
        accompanyingDocumentReference:
          validDocument.accompanyingDocumentReference
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(Object.keys(result.view.context.errors)).toEqual([
      'accompanyingDocumentType',
      'accompanyingDocumentDateOfIssue',
      'file'
    ])
    expect(result.view.context.values.accompanyingDocumentReference).toBe(
      validDocument.accompanyingDocumentReference
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should leave an untouched form behind on the exit to the overview, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: SAVE_AND_RETURN_TO_OVERVIEW
    })
    expect(result.response.redirect).toBe(hubPath(result.journeyId))
    expect(result.after).toEqual(result.before)
  })
})

describe('documents — scan-status poll and view context', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should serve the scan statuses the client polls, keyed by upload id', async () => {
    const uploadId = await registeredUpload('itahc.pdf')
    const result = await driveHandler(statusRoute.handler, {
      seed: {
        documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
      }
    })
    expect(result.response.payload.documents).toEqual([
      { uploadId, scanStatus: 'COMPLETE', tagKey: 'COMPLETE' }
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
        { uploadId, scanStatus: 'PENDING', tagKey: 'PENDING' }
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
      { uploadId, scanStatus: 'COMPLETE', tagKey: 'COMPLETE' }
    ])

    const afterPoll = await driveHandler(get, { seed })
    expect(afterPoll.view.context.rows[0][3].html).toContain(TAG_COMPLETE)
  })

  it.each([
    ['virus.pdf', 'REJECTED_FILE_VIRUS'],
    ['upload-failed.pdf', 'REJECTED_FILE_UPLOAD_FAILED'],
    ['download-failed.pdf', 'REJECTED_FILE_DOWNLOAD_FAILED']
  ])(
    'Should report a %s rejection with the tag key naming its reason',
    async (filename, tagKey) => {
      const uploadId = await registeredUpload(filename)
      const result = await driveHandler(statusRoute.handler, {
        seed: { documents: [storedDocument({ uploadId, filename })] }
      })
      expect(result.response.payload.documents).toEqual([
        { uploadId, scanStatus: 'REJECTED', tagKey }
      ])
    }
  )

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
      'data-scan-status': 'PENDING',
      'data-tag-key': 'PENDING'
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
})

describe('documents — naming the reason a scan refused a document', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  it.each([
    ['virus.pdf', 'REJECTED_FILE_VIRUS', TAG_VIRUS_FOUND],
    ['upload-failed.pdf', 'REJECTED_FILE_UPLOAD_FAILED', TAG_UPLOAD_FAILED],
    [
      'download-failed.pdf',
      'REJECTED_FILE_DOWNLOAD_FAILED',
      TAG_DOWNLOAD_FAILED
    ]
  ])(
    'Should name the reason %s was refused for, in the tag and the key the client rewrites by',
    async (filename, tagKey, tagText) => {
      const uploadId = await registeredUpload(filename)
      const seed = { documents: [storedDocument({ uploadId, filename })] }
      await driveHandler(statusRoute.handler, { seed })

      const result = await driveHandler(get, { seed })

      expect(result.view.context.rows[0][3].html).toContain(tagText)
      expect(result.view.context.rows[0][3].attributes).toEqual({
        'data-upload-id': uploadId,
        'data-scan-status': 'REJECTED',
        'data-tag-key': tagKey
      })
    }
  )

  it('Should fall back to the plain refusal tag for a reason it has no wording for', async () => {
    const uploadId = await registeredUpload('itahc.pdf')
    const seed = {
      documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
    }
    const read = vi.spyOn(documentUploads, 'scanStatus').mockResolvedValue({
      scanStatus: 'REJECTED',
      rejectionReason: 'FILE_SOMETHING_NEW'
    })

    try {
      const result = await driveHandler(get, { seed })

      expect(result.view.context.rows[0][3].html).toContain(TAG_REJECTED)
      expect(result.view.context.rows[0][3].attributes).toEqual({
        'data-upload-id': uploadId,
        'data-scan-status': 'REJECTED',
        'data-tag-key': 'REJECTED'
      })
    } finally {
      read.mockRestore()
    }
  })

  it('Should hand the view the browser-side upload limit and the scan copy the client rewrites tags with', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.maxFileSize).toBe(MAX_FILE_SIZE_BYTES)
    expect(result.view.context.oversizeFileMessage).toBe(oversizeMessage(copy))
    expect(JSON.parse(result.view.context.scanCopyJson)).toEqual({
      COMPLETE: {
        text: TAG_COMPLETE,
        classes: 'govuk-tag--green',
        announcement: 'Document scan complete: the file is safe to use'
      },
      REJECTED: {
        text: TAG_REJECTED,
        classes: REFUSED_TAG_CLASSES,
        announcement:
          'Document check failed: the file cannot be used. Remove it and try again.'
      },
      REJECTED_FILE_VIRUS: {
        text: TAG_VIRUS_FOUND,
        classes: REFUSED_TAG_CLASSES,
        announcement:
          'Document check failed: the file contains a virus. Remove it and try again.'
      },
      REJECTED_FILE_UPLOAD_FAILED: {
        text: TAG_UPLOAD_FAILED,
        classes: REFUSED_TAG_CLASSES,
        announcement:
          'Document check failed: the file could not be uploaded. Remove it and try again.'
      },
      REJECTED_FILE_DOWNLOAD_FAILED: {
        text: TAG_DOWNLOAD_FAILED,
        classes: REFUSED_TAG_CLASSES,
        announcement:
          'Document check failed: the file could not be downloaded. Remove it and try again.'
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

  it('Should offer thirteen document types behind the select text, in the order the page offers them', async () => {
    const result = await driveHandler(get)
    const items = result.view.context.documentTypeItems
    expect(items[0]).toEqual({ value: '', text: 'Select one' })
    expect(items.slice(1).map(({ value }) => value)).toEqual(
      OFFERED_DOCUMENT_TYPE_CODES
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
  useStubbedJourney(SET_ID, dispatchPages)

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
    const uploadId = await registeredUpload('itahc.pdf')
    const held = await journeyHolding(uploadId)

    const response = await readFile(held, UNHELD_UPLOAD_ID)

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

  const UPLOAD_UNAVAILABLE_MESSAGE =
    'Documents cannot be uploaded at the moment. Reload the page or come back later.'

  const uploaderError = () =>
    Object.assign(
      new Error('Failed to open an upload session: 503 Service Unavailable'),
      { status: SERVICE_UNAVAILABLE }
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

      const page = renderedPageOf(result)
      const addButton = page.querySelector('button[name="action"][value="add"]')
      expect(addButton.getAttribute('formaction')).toBeNull()
      expect(addButton.getAttribute('formenctype')).toBeNull()
      expect(addButton.getAttribute('disabled')).toBeNull()
      expect(addButton.getAttribute('aria-disabled')).toBe('true')
      expect(`#${addButton.id}`).toBe(ADD_DOCUMENT_ANCHOR)

      const reason = page.querySelector(
        `#${addButton.getAttribute('aria-describedby')}`
      )
      expect(trimmedTextOf(reason)).toContain(UPLOAD_UNAVAILABLE_MESSAGE)
      expect(reason.nextElementSibling.id).toBe(addButton.id)

      const summaryLink = [
        ...page.querySelectorAll('.govuk-error-summary a')
      ].find((link) => trimmedTextOf(link) === UPLOAD_UNAVAILABLE_MESSAGE)
      expect(summaryLink.getAttribute('href')).toBe(ADD_DOCUMENT_ANCHOR)

      expect(trimmedTextOf(page.querySelector('#documents-added'))).toContain(
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

describe('documents — the session the add form posts to', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())
  afterEach(() => vi.restoreAllMocks())

  const uploadsRegisteredAgainst = async (journeyId) =>
    documentUploads.listByNotification({ journeyId })

  const uploadAFileInto = async (journeyId, correlationId) => {
    const registered = await documentUploads.findByCorrelationId({
      journeyId,
      correlationId
    })
    recordSubmittedUpload(registered.uploadId, addDocumentSubmission())
    return registered.uploadId
  }

  it('Should reuse the session it is already showing when the refresh link brings its handle back', async () => {
    const opened = await driveHandler(get)

    const refreshed = await driveHandler(get, {
      journeyId: opened.journeyId,
      query: { attempt: 1, uploadSession: opened.view.context.uploadSession }
    })

    expect(refreshed.view.context.uploadPath).toBe(
      opened.view.context.uploadPath
    )
    expect(refreshed.view.context.uploadSession).toBe(
      opened.view.context.uploadSession
    )
    await expect(
      uploadsRegisteredAgainst(opened.journeyId)
    ).resolves.toHaveLength(1)
  })

  it('Should reuse the session it is already showing when a failed remove brings its handle back', async () => {
    const opened = await driveHandler(get)

    const refused = await driveHandler(post, {
      journeyId: opened.journeyId,
      seed: { documents: [storedDocument()] },
      saveFailure: backendRefusal(),
      payload: {
        action: 'remove:0',
        uploadSession: opened.view.context.uploadSession
      }
    })

    expect(refused.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(refused.view.context.uploadPath).toBe(opened.view.context.uploadPath)
    await expect(
      uploadsRegisteredAgainst(opened.journeyId)
    ).resolves.toHaveLength(1)
  })

  it('Should carry the open session in the link that refreshes the scan statuses', async () => {
    const result = await driveHandler(get, {
      seed: { documents: [storedDocument({ uploadId: 'up-1234' })] }
    })

    expect(result.view.context.refreshHref).toBe(
      `${pagePath(result.journeyId, 'accompanying-documents')}?attempt=1&uploadSession=${result.view.context.uploadSession}`
    )
  })

  /**
   * The handle arrives from the browser, so the session it names is looked up on the notification
   * the page belongs to. A handle another notification opened must reach nothing, or a file would
   * be uploaded into a session scoped to someone else's notification.
   */
  it('Should open a session of its own for a handle another notification opened', async () => {
    const other = await registeredSession((await store.create()).journeyId)

    const result = await driveHandler(get, {
      query: { uploadSession: other.correlationId }
    })

    expect(result.view.context.uploadSession).not.toBe(other.correlationId)
    expect(result.view.context.uploadPath).toBeDefined()
    await expect(uploadsRegisteredAgainst(result.journeyId)).resolves.toEqual([
      {
        uploadId: expect.any(String),
        correlationId: result.view.context.uploadSession,
        claimed: false
      }
    ])
  })

  it('Should open a session of its own when the session it is showing cannot be read, and say so once', async () => {
    const unreadable = backendRefusal('get document upload session')
    const opened = await driveHandler(get)
    vi.spyOn(documentUploads, 'findByCorrelationId').mockRejectedValue(
      unreadable
    )

    const refreshed = await driveHandler(get, {
      journeyId: opened.journeyId,
      query: { attempt: 1, uploadSession: opened.view.context.uploadSession }
    })

    expect(refreshed.view.context.uploadSession).not.toBe(
      opened.view.context.uploadSession
    )
    expect(
      refreshed.logger.entries.filter(({ level }) => level === 'warn')
    ).toEqual([
      {
        level: 'warn',
        fields: {
          err: unreadable,
          status: SERVICE_UNAVAILABLE,
          journeyId: opened.journeyId,
          correlationId: opened.view.context.uploadSession
        },
        message:
          'Could not read the upload session this page already opened, opening another'
      }
    ])
  })

  it('Should open a session of its own when the session the request names has already taken a file', async () => {
    const opened = await driveHandler(get)
    const spentSession = opened.view.context.uploadSession
    await uploadAFileInto(opened.journeyId, spentSession)

    const refreshed = await driveHandler(get, {
      journeyId: opened.journeyId,
      query: { attempt: 1, uploadSession: spentSession }
    })

    expect(refreshed.view.context.uploadSession).not.toBe(spentSession)
    expect(refreshed.view.context.uploadPath).toBeDefined()
    await expect(
      uploadsRegisteredAgainst(opened.journeyId)
    ).resolves.toContainEqual({
      uploadId: expect.any(String),
      correlationId: refreshed.view.context.uploadSession,
      claimed: false
    })
  })

  it('Should say which session had already taken a file, and that another was opened', async () => {
    const opened = await driveHandler(get)
    const spentSession = opened.view.context.uploadSession
    const spentUploadId = await uploadAFileInto(opened.journeyId, spentSession)

    const refreshed = await driveHandler(get, {
      journeyId: opened.journeyId,
      query: { attempt: 1, uploadSession: spentSession }
    })

    expect(refreshed.logger.entries).toEqual([
      {
        level: 'info',
        fields: {
          journeyId: opened.journeyId,
          uploadId: spentUploadId,
          correlationId: spentSession,
          uploadStatus: UPLOAD_SCANNING
        },
        message: 'Upload session has already taken a file, opening another'
      },
      {
        level: 'info',
        fields: {
          journeyId: opened.journeyId,
          uploadId: expect.any(String),
          correlationId: refreshed.view.context.uploadSession
        },
        message: UPLOAD_SESSION_OPENED_LINE
      }
    ])
  })
})

describe('documents — what the page response lets the browser keep', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should forbid the browser storing the page it serves', async () => {
    const result = await driveHandler(get)

    expect(result.view.headers['cache-control']).toBe('no-store')
  })

  it('Should forbid the browser storing the page it serves with a refusal on it', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue', ...validDocument }
    })

    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.headers['cache-control']).toBe('no-store')
  })
})

describe('documents — backend and upload service failures', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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
    const uploadId = await registeredUpload('itahc.pdf')
    return {
      uploadId,
      seed: { documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })] }
    }
  }

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

  it('Should log the removal save fallback once with the index, the upload id and the backend error, keeping the document', async () => {
    const { uploadId, seed } = await seededUpload()
    const failure = unavailableBackendError(SAVE_ANSWERS)
    const result = await driveHandler(post, {
      seed,
      saveFailure: failure,
      payload: { action: 'remove:0' }
    })
    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual(seed)
    // The failure render re-opens the add form, which logs a line of its own,
    // so the fallback is asserted as present rather than as the only line.
    expect(result.logger.entries).toContainEqual(
      saveFallbackEntry({
        journeyId: result.journeyId,
        index: 0,
        uploadId,
        err: failure
      })
    )
  })

  it('Should log that a retried removal found the document already gone, then save the notification without it', async () => {
    const result = await driveHandler(post, { payload: retryRemovalPayload })
    expect(result.response.redirect).toContain(DOCUMENTS_SLUG)
    expectOneLogged(result.logger, alreadyRemovedEntry(result.journeyId))
  })

  it('Should log the retried removal save fallback once, with the backend error, when the notification still cannot be saved', async () => {
    const failure = unavailableBackendError(SAVE_ANSWERS)
    const result = await driveHandler(post, {
      saveFailure: failure,
      payload: retryRemovalPayload
    })
    expect(result.response.statusCode).toBe(500)
    expect(result.logger.entries).toContainEqual(
      alreadyRemovedEntry(result.journeyId)
    )
    expect(result.logger.entries).toContainEqual(
      saveFallbackEntry({
        journeyId: result.journeyId,
        index: 0,
        uploadId: ALREADY_REMOVED_UPLOAD_ID,
        err: failure
      })
    )
  })
})

describe('documents — the add form on a notification at its cap', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  it('Should close the add form, so no file is uploaded only to be refused', async () => {
    const result = await driveHandler(get, { seed: documentsAtCapacity() })

    expect(result.view.context.addFormClosed).toBe(true)
    expect(result.view.context.addFormClosedReason).toBe(
      `You can upload a maximum of ${MAX_DOCUMENTS} files`
    )
    // The session still opened — the form is closed on capacity, not on a
    // failure to reach the upload service.
    expect(result.view.context.uploadFormUnavailable).toBe(false)
  })

  it('Should render the add button with no formaction, so it cannot post a file to the upload service', async () => {
    const page = renderedPageOf(
      await driveHandler(get, { seed: documentsAtCapacity() })
    )

    const addButton = page.querySelector('#add-document')
    expect(addButton.getAttribute('formaction')).toBeNull()
    expect(addButton.getAttribute('aria-disabled')).toBe('true')
  })
})

describe('documents — where the save buttons post', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())
  afterEach(() => vi.restoreAllMocks())

  const saveButtonsOf = (result) =>
    [
      ...renderedPageOf(result).querySelectorAll('.govuk-button-group button')
    ].filter((button) =>
      [SAVE_AND_CONTINUE_LABEL, SAVE_AND_RETURN_TO_OVERVIEW_LABEL].includes(
        trimmedTextOf(button)
      )
    )

  const addButtonOf = (result) =>
    renderedPageOf(result).querySelector('#add-document')

  it('Should post the add button and both save buttons to the upload session as multipart while the add form is open', async () => {
    const result = await driveHandler(get)

    const buttons = saveButtonsOf(result)
    expect(buttons).toHaveLength(2)
    for (const button of [...buttons, addButtonOf(result)]) {
      expect(button.getAttribute('formaction')).toBe(
        result.view.context.uploadPath
      )
      expect(button.getAttribute('formenctype')).toBe('multipart/form-data')
    }
  })

  it('Should post both save buttons to this page when the add form is closed', async () => {
    const result = await driveHandler(get, { seed: documentsAtCapacity() })

    const buttons = saveButtonsOf(result)
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      expect(button.getAttribute('formaction')).toBeNull()
    }
  })

  it('Should post both save buttons to this page when a taken-on document is waiting to be saved, so the save is retried', async () => {
    const result = await driveClaim(submittedDocument(), {
      saveFailure: backendRefusal()
    })

    expect(result.view.context.unsavedDocument).toBeDefined()
    for (const button of [...saveButtonsOf(result), addButtonOf(result)]) {
      expect(button.getAttribute('formaction')).toBeNull()
    }
  })

  it('Should post both save buttons to this page when a removal is waiting to be saved, so the removal is retried', async () => {
    const opened = await driveHandler(get)

    const result = await driveHandler(post, {
      journeyId: opened.journeyId,
      seed: { documents: [storedDocument()] },
      saveFailure: backendRefusal(),
      payload: { action: 'remove:0' }
    })

    expect(result.view.context.pendingDocumentRemoval).toBeDefined()
    for (const button of [...saveButtonsOf(result), addButtonOf(result)]) {
      expect(button.getAttribute('formaction')).toBeNull()
    }
  })
})

describe('documents — what a document reference may carry', () => {
  beforeAll(configureEngine)
  beforeEach(() => store.clear())

  const REFERENCE_CHARACTERS_MESSAGE =
    'Document reference must only include letters, numbers, spaces, hyphens, full stops and forward slashes'

  // The shapes real documents carry: an IATA air waybill, a TRACES
  // certificate, a commercial invoice, and a plain alphanumeric reference.
  it.each([
    '125-12345675',
    'CHEDA.GB.2026.1234567',
    'INV 2026/0042',
    'GBHC1234567890'
  ])('Should take on a document whose reference is %s', async (reference) => {
    const result = await driveClaim(
      submittedDocument({ accompanyingDocumentReference: reference })
    )

    expect(result.response.redirect).toBeDefined()
    const [entry] = result.after.documents
    expect(entry.accompanyingDocumentReference).toBe(reference)
  })

  it.each(['REF<script>', 'REF;DROP', 'REF|pipe'])(
    'Should refuse a reference carrying a character the claim would reject: %s',
    async (reference) => {
      const result = await driveClaim(
        submittedDocument({ accompanyingDocumentReference: reference })
      )

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors.accompanyingDocumentReference).toBe(
        REFERENCE_CHARACTERS_MESSAGE
      )
      expect(result.after).toEqual(result.before)
    }
  )

  it('Should refuse a reference past the length the claim accepts, naming that length', async () => {
    const result = await driveClaim(
      submittedDocument({
        accompanyingDocumentReference: 'R'.repeat(REFERENCE_MAX_LENGTH + 1)
      })
    )

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.accompanyingDocumentReference).toBe(
      `Document reference must be ${REFERENCE_MAX_LENGTH} characters or fewer`
    )
    expect(result.after).toEqual(result.before)
  })
})
