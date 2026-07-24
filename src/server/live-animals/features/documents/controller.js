import { Readable } from 'node:stream'
import Joi from 'joi'

import { hubPath, pagePath, pageRoutePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { isBlank } from '../../lib/answered.js'
import {
  compose,
  dateParts,
  maxText,
  validate
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { copy as sharedEn } from '../../shared/copy.en.js'
import { copy as sharedCy } from '../../shared/copy.cy.js'
import { maxDocuments } from '../../bridge/applicability.js'
import { documentUploads } from '../../services/document-uploads/index.js'
import { deriveDocumentTypeFromFilename } from './derive-document-type.js'
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_FILE_TYPES_HINT,
  ALLOWED_MIME_TYPES,
  FILE_TYPE_MESSAGE,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  MAX_PAYLOAD_BYTES,
  OVERSIZE_FILE_MESSAGE,
  attachmentTypeFor,
  exceedsMaxFileSize
} from './upload-config.js'
import {
  resolveContentDisposition,
  resolveDownloadContentType
} from './download-content-type.js'
import { MAX_POLL_ATTEMPTS, SCAN_STATUS } from './scan-poll.js'
import { documentsPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['documents'] }
const view = `${TEMPLATES}/features/documents/template`

export const MAX_DOCUMENTS = maxDocuments()

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const NOT_PROVIDED = copy.notProvided
const CANNOT_CONTINUE_MESSAGE = copy.errors.cannotContinue
const UPLOAD_FAILURE_MESSAGE = copy.errors.uploadFailed

const DOCUMENTS_ADDED_ANCHOR = '#documents-added'

const HTTP_STATUS_BAD_REQUEST = 400
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500

const fields = compose(
  maxText('accompanyingDocumentReference', 58, copy.errors.referenceMaxLength),
  dateParts('accompanyingDocumentDateOfIssue', copy.errors.dateInvalid)
)

export const documentFromPayload = (payload) => ({
  accompanyingDocumentReference: (
    payload.accompanyingDocumentReference ?? ''
  ).trim(),
  accompanyingDocumentDateOfIssue: kit.readDate(
    payload,
    'accompanyingDocumentDateOfIssue'
  )
})

// Every document field is mandatory per record and there is no edit
// page — a record added with blanks could never be completed in place,
// so presence is enforced at add time.
const presenceErrors = (entry) => ({
  ...(entry.accompanyingDocumentReference
    ? {}
    : { accompanyingDocumentReference: copy.errors.referenceRequired }),
  ...(isBlank(entry.accompanyingDocumentDateOfIssue)
    ? { 'accompanyingDocumentDateOfIssue-day': copy.errors.dateRequired }
    : {})
})

const EMPTY_FORM = {
  accompanyingDocumentReference: '',
  accompanyingDocumentDateOfIssue: {}
}

export const fileErrors = (file) => {
  if (!file?.payload?.length) return { file: copy.errors.fileRequired }
  if (exceedsMaxFileSize(file.payload.length)) {
    return { file: OVERSIZE_FILE_MESSAGE }
  }
  if (!attachmentTypeFor(file.filename ?? '')) {
    return { file: FILE_TYPE_MESSAGE }
  }
  return {}
}

const scanStatusOf = async (entry, refresh) => {
  if (!entry.uploadId) return SCAN_STATUS.COMPLETE
  try {
    return await documentUploads.scanStatus({
      uploadId: entry.uploadId,
      filename: entry.filename,
      refresh
    })
  } catch {
    return SCAN_STATUS.PENDING
  }
}

const withScanStatus = (documents, refresh) =>
  Promise.all(
    documents.map(async (item) => ({
      ...item,
      scanStatus: await scanStatusOf(item.entry, refresh)
    }))
  )

const loadPage = async (request, h) => {
  const { journey, answers, scope, evaluation } = await state.get(request, h)
  const documents = await withScanStatus(
    state.collectionView(answers, ['documents'], evaluation),
    getAttempt(request) > 0
  )
  return { journey, answers, scope, evaluation, documents }
}

const SCAN_STATUS_TAGS = {
  COMPLETE: {
    text: copy.scanTags.safe,
    classes: 'govuk-tag--green',
    announcement: copy.announce.safe
  },
  REJECTED: {
    text: copy.scanTags.virusFound,
    classes: 'govuk-tag--red',
    announcement: copy.announce.virusFound
  },
  PENDING: { text: copy.scanTags.checking, classes: 'govuk-tag--blue' }
}

const UNKNOWN_TAG = { text: copy.scanTags.unknown, classes: 'govuk-tag--grey' }

export const scanCopyJson = JSON.stringify({
  ...SCAN_STATUS_TAGS,
  UNKNOWN: UNKNOWN_TAG
})

const statusTagHtml = (scanStatus) => {
  const tag = SCAN_STATUS_TAGS[scanStatus] ?? UNKNOWN_TAG
  return `<strong class="govuk-tag ${tag.classes}">${tag.text}</strong>`
}

const cellText = (value) => (value ?? '').trim() || NOT_PROVIDED

const dateText = (value) =>
  isBlank(value) ? NOT_PROVIDED : `${value.day}/${value.month}/${value.year}`

const REMOVE_ACTION_PREFIX = 'remove:'

// A removal deletes the backend upload, so it submits the page form — the
// crumb travels with it and no GET can trigger it.
const removeButton = (index) =>
  `<button type="submit" class="govuk-link app-link-button" name="action" value="${REMOVE_ACTION_PREFIX}${index}">` +
  `${copy.remove}<span class="govuk-visually-hidden"> ${copy.removeHidden(index + 1)}</span></button>`

const filePath = (journeyId, uploadId) =>
  pagePath(journeyId, `${page.slug}/${uploadId}/file`)

// Reading the file back is a read, so it is a link, not a submit — it needs
// no crumb and the form's client-side submit handling never sees it.
const viewFileLink = (entry, index, journeyId) =>
  `<a class="govuk-link govuk-!-margin-right-3" href="${filePath(journeyId, entry.uploadId)}">` +
  `${copy.viewFile}<span class="govuk-visually-hidden"> ${copy.viewFileHidden(index + 1)}</span></a>`

// A file is only offered once its scan has settled clean — a pending or
// virus-bearing upload has nothing safe to open.
const isViewable = (entry, scanStatus) =>
  Boolean(entry.uploadId) && scanStatus === SCAN_STATUS.COMPLETE

const actionsCell = ({ entry, index, scanStatus, journeyId }) => ({
  html: isViewable(entry, scanStatus)
    ? `${viewFileLink(entry, index, journeyId)}${removeButton(index)}`
    : removeButton(index),
  attributes: {
    'data-view-file-text': copy.viewFile,
    'data-view-file-hidden': copy.viewFileHidden(index + 1)
  }
})

// The scan-status cell carries the polling contract: the client rewrites the
// tag it holds in place, keyed by upload id.
const statusCell = (entry, scanStatus) => ({
  html: statusTagHtml(scanStatus),
  attributes: entry.uploadId
    ? { 'data-upload-id': entry.uploadId, 'data-scan-status': scanStatus }
    : undefined
})

const documentRows = (documents, journeyId) =>
  documents.map(({ index, entry, scanStatus }) => [
    { text: cellText(entry.accompanyingDocumentReference) },
    { text: cellText(copy.types[entry.accompanyingDocumentType]) },
    { text: dateText(entry.accompanyingDocumentDateOfIssue) },
    statusCell(entry, scanStatus),
    actionsCell({ entry, index, scanStatus, journeyId })
  ])

const rejectedErrors = (documents) =>
  documents
    .filter((item) => item.scanStatus === SCAN_STATUS.REJECTED)
    .map((item) => ({
      text: copy.errors.virusFound(
        item.entry.filename ?? copy.errors.fileFallbackName
      ),
      href: DOCUMENTS_ADDED_ANCHOR
    }))

const getAttempt = (request) => {
  const parsed = Number.parseInt(request.query?.attempt ?? '0', 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

const refreshHref = (request, attempt) => {
  const base = kit.withChangeContext(
    request,
    pagePath(request.params.journeyId, page.slug)
  )
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}attempt=${attempt}`
}

const render = (
  request,
  h,
  { journey, documents },
  values,
  errors = {},
  summaryErrors = [],
  extra = {}
) => {
  const attempt = getAttempt(request)
  const anyPending = documents.some(
    (item) => item.scanStatus === SCAN_STATUS.PENDING
  )
  const errorList = [
    ...rejectedErrors(documents),
    ...summaryErrors,
    ...(kit.errorSummary(errors)?.errorList ?? [])
  ]
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey
    }),
    ...extra,
    copy,
    rows: documentRows(documents, journey.journeyId),
    hasDocuments: documents.length > 0,
    values,
    errors,
    errorSummary: errorList.length
      ? { titleText: sharedCopy.errorSummary.title, errorList }
      : null,
    anyPending,
    timedOut: anyPending && attempt >= MAX_POLL_ATTEMPTS,
    refreshHref: refreshHref(request, attempt + 1),
    acceptAttribute: ACCEPT_ATTRIBUTE,
    allowedFileTypesHint: ALLOWED_FILE_TYPES_HINT,
    maxFileSizeLabel: MAX_FILE_SIZE_LABEL,
    maxFileSize: MAX_FILE_SIZE_BYTES,
    oversizeFileMessage: OVERSIZE_FILE_MESSAGE,
    scanCopyJson,
    dateOfIssue: kit.dateField('accompanyingDocumentDateOfIssue', {
      label: copy.dateOfIssue.label,
      hint: copy.dateOfIssue.hint,
      value: values.accompanyingDocumentDateOfIssue ?? {},
      error: errors['accompanyingDocumentDateOfIssue-day']
    })
  })
}

const pad = (value, length) => String(value ?? '').padStart(length, '0')

const isoDate = ({ day, month, year } = {}) => {
  const paddedYear = pad(year, 4)
  const paddedMonth = pad(month, 2)
  const paddedDay = pad(day, 2)
  return `${paddedYear}-${paddedMonth}-${paddedDay}`
}

const get = async (request, h) => {
  const pageState = await loadPage(request, h)
  return render(request, h, pageState, EMPTY_FORM)
}

const scanned = (documents) =>
  documents
    .filter(({ entry }) => entry.uploadId)
    .map(({ entry, scanStatus }) => ({ uploadId: entry.uploadId, scanStatus }))

// The JSON leg the client bundle polls. A poll is the scripted equivalent of
// the refresh link, so it asks the upload service for a fresh status.
const getStatus = async (request, h) => {
  const { answers, evaluation } = await state.get(request, h)
  const documents = await withScanStatus(
    state.collectionView(answers, ['documents'], evaluation),
    true
  )
  return h.response({ documents: scanned(documents) })
}

const HTTP_STATUS_NOT_FOUND = 404

// The upload id is a path segment, so it is constrained before it reaches
// the service — no traversal, no encoded separators.
const UPLOAD_ID_PATTERN = /^[a-zA-Z0-9-]+$/

const ownsUpload = (answers, evaluation, uploadId) =>
  state
    .collectionView(answers, ['documents'], evaluation)
    .some(({ entry }) => entry.uploadId === uploadId)

const fileResponse = (h, streamed) =>
  h
    .response(Readable.fromWeb(streamed.body))
    .header('Content-Type', resolveDownloadContentType(streamed.headers))
    .header('Content-Disposition', resolveContentDisposition(streamed.headers))
    .header('X-Content-Type-Options', 'nosniff')

// A well-formed id belonging to somebody else's journey is answered 404, not
// 403 — the journey never confirms an upload it does not own exists.
const getFile = async (request, h) => {
  const { answers, evaluation } = await state.get(request, h)
  const { uploadId } = request.params
  if (!ownsUpload(answers, evaluation, uploadId)) {
    return h.response().code(HTTP_STATUS_NOT_FOUND)
  }
  return fileResponse(h, await documentUploads.streamFile(uploadId))
}

const uploadDetails = (journey, entry, file, filename) => ({
  journeyId: journey.journeyId,
  filename,
  contentType: file.headers?.['content-type'],
  bytes: file.payload,
  documentType: entry.accompanyingDocumentType,
  documentReference: entry.accompanyingDocumentReference,
  dateOfIssue: isoDate(entry.accompanyingDocumentDateOfIssue),
  maxFileSize: MAX_FILE_SIZE_BYTES,
  mimeTypes: ALLOWED_MIME_TYPES
})

const capacityExceededError = () => [
  {
    text: copy.errors.maxDocuments(MAX_DOCUMENTS),
    href: DOCUMENTS_ADDED_ANCHOR
  }
]

const pendingDocumentSaveFrom = (payload) => {
  const uploadId = payload.retryUploadId ?? ''
  const filename = payload.retryFilename ?? ''
  return UPLOAD_ID_PATTERN.test(uploadId) && attachmentTypeFor(filename)
    ? { uploadId, filename }
    : null
}

const documentAddErrors = (payload, bare, pendingDocumentSave) => {
  const { errors } = validate(fields, payload)
  return {
    ...errors,
    ...presenceErrors(bare),
    ...(pendingDocumentSave ? {} : fileErrors(payload.file))
  }
}

const uploadOutcome = async (pageState, entry, file, filename) => {
  try {
    const uploadId = await documentUploads.upload(
      uploadDetails(pageState.journey, entry, file, filename)
    )
    return { uploadId }
  } catch {
    return { failed: true }
  }
}

const postAdd = async (request, h, payload) => {
  const pageState = await loadPage(request, h)
  const bare = documentFromPayload(payload)
  const pendingDocumentSave = pendingDocumentSaveFrom(payload)
  if (!pendingDocumentSave && pageState.documents.length >= MAX_DOCUMENTS) {
    return render(
      request,
      h,
      pageState,
      bare,
      {},
      capacityExceededError()
    ).code(HTTP_STATUS_BAD_REQUEST)
  }
  const allErrors = documentAddErrors(payload, bare, pendingDocumentSave)
  if (Object.keys(allErrors).length > 0) {
    return render(request, h, pageState, bare, allErrors).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const filename = pendingDocumentSave?.filename ?? payload.file.filename
  const entry = {
    ...bare,
    accompanyingDocumentType: deriveDocumentTypeFromFilename(filename)
  }
  const outcome = pendingDocumentSave
    ? { uploadId: pendingDocumentSave.uploadId }
    : await uploadOutcome(pageState, entry, payload.file, filename)
  if (outcome.failed) {
    return render(request, h, pageState, bare, {
      file: UPLOAD_FAILURE_MESSAGE
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }

  const savedEntry = {
    ...entry,
    accompanyingDocumentAttachmentType: attachmentTypeFor(filename),
    uploadId: outcome.uploadId,
    filename
  }
  const failure = await kit.recoverableSave(
    async () => {
      const alreadyCanonicallySaved = pageState.documents.some(
        ({ entry: document }) => document.uploadId === savedEntry.uploadId
      )
      if (alreadyCanonicallySaved) {
        await state.commit(request, h, {
          documents: pageState.answers.documents ?? []
        })
      } else {
        await state.appendEntry(request, h, 'documents', savedEntry)
      }
    },
    () =>
      render(request, h, pageState, bare, {}, [], {
        recoverableError: true,
        pendingDocumentSave: {
          uploadId: savedEntry.uploadId,
          filename: savedEntry.filename
        }
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure

  return h.redirect(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    )
  )
}

const isStillSettling = (documents) =>
  documents.some((item) => item.scanStatus !== SCAN_STATUS.COMPLETE)

const settlingSummaryErrors = (documents) =>
  documents.some((item) => item.scanStatus === SCAN_STATUS.REJECTED)
    ? []
    : [{ text: CANNOT_CONTINUE_MESSAGE, href: DOCUMENTS_ADDED_ANCHOR }]

const isRemoveAction = (action) => action.startsWith(REMOVE_ACTION_PREFIX)

const removeIndexOf = (action) =>
  Number(action.slice(REMOVE_ACTION_PREFIX.length))

const documentAt = (answers, evaluation, index) =>
  state.collectionView(answers, ['documents'], evaluation)[index]?.entry

const retryProjectionSave = async (
  request,
  h,
  pageState,
  pendingDocumentRemoval
) => {
  const failure = await kit.recoverableSave(
    async () => {
      await state.commit(request, h, {
        documents: pageState.answers.documents ?? []
      })
    },
    () =>
      render(request, h, pageState, EMPTY_FORM, {}, [], {
        recoverableError: true,
        pendingDocumentRemoval
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure
  return h.redirect(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    )
  )
}

const postRemove = async (request, h, index, { retryUploadId = null } = {}) => {
  const pageState = await loadPage(request, h)
  const retryIndex = retryUploadId
    ? pageState.documents.findIndex(
        ({ entry: document }) => document.uploadId === retryUploadId
      )
    : index
  if (retryUploadId && retryIndex === -1) {
    return retryProjectionSave(request, h, pageState, {
      index,
      uploadId: retryUploadId
    })
  }

  const entry = documentAt(pageState.answers, pageState.evaluation, retryIndex)
  if (!entry) return h.response().code(HTTP_STATUS_BAD_REQUEST)

  const backToPage = kit.withChangeContext(
    request,
    pagePath(request.params.journeyId, page.slug)
  )
  if (entry.uploadId && !retryUploadId) {
    try {
      await documentUploads.remove(entry.uploadId)
    } catch {
      return h.redirect(backToPage)
    }
  }
  const failure = await kit.recoverableSave(
    async () => {
      await state.removeEntry(request, h, 'documents', retryIndex)
    },
    () =>
      render(request, h, pageState, EMPTY_FORM, {}, [], {
        recoverableError: true,
        pendingDocumentRemoval: {
          index,
          uploadId: entry.uploadId
        }
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure

  return h.redirect(backToPage)
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const action = payload.action ?? ''
  if (
    payload.retryRemoveUploadId &&
    UPLOAD_ID_PATTERN.test(payload.retryRemoveUploadId)
  ) {
    return postRemove(request, h, Number(payload.retryRemoveIndex), {
      retryUploadId: payload.retryRemoveUploadId
    })
  }
  if (action === 'add') return postAdd(request, h, payload)
  if (isRemoveAction(action)) {
    return postRemove(request, h, removeIndexOf(action))
  }
  const pageState = await loadPage(request, h)
  if (!kit.hubExitTarget(request) && isStillSettling(pageState.documents)) {
    return render(
      request,
      h,
      pageState,
      EMPTY_FORM,
      {},
      settlingSummaryErrors(pageState.documents)
    )
  }
  return h.redirect(await kit.nextTarget(request, page, pageState.scope))
}

const HTTP_STATUS_PAYLOAD_TOO_LARGE = 413

const isOversizeBoom = (request) =>
  request.response?.isBoom &&
  request.response.output?.statusCode === HTTP_STATUS_PAYLOAD_TOO_LARGE

export const handleOversizePayload = async (request, h) => {
  if (!isOversizeBoom(request)) return h.continue
  const pageState = await loadPage(request, h)
  const crumb =
    request.state?.crumb ?? request.server.plugins.crumb?.generate?.(request, h)
  return render(
    request,
    h,
    pageState,
    EMPTY_FORM,
    { file: OVERSIZE_FILE_MESSAGE },
    [],
    { crumb }
  ).code(HTTP_STATUS_BAD_REQUEST)
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath(page.slug),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pageRoutePath(page.slug),
    options: {
      ...open,
      payload: {
        maxBytes: MAX_PAYLOAD_BYTES,
        parse: true,
        multipart: { output: 'annotated' }
      },
      ext: {
        onPreResponse: { method: handleOversizePayload }
      }
    },
    handler: post
  },
  {
    method: 'GET',
    path: pageRoutePath(`${page.slug}/status`),
    options: open,
    handler: getStatus
  },
  {
    method: 'GET',
    path: pageRoutePath(`${page.slug}/{uploadId}/file`),
    options: {
      ...open,
      validate: {
        params: Joi.object({
          journeyId: Joi.string().required(),
          uploadId: Joi.string().pattern(UPLOAD_ID_PATTERN).required()
        })
      }
    },
    handler: getFile
  }
]
