import { hubPath, pagePath, TEMPLATES } from '../../config.js'
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
  const { journey, answers, scope } = await state.get(request, h)
  const documents = await withScanStatus(
    state.collectionView(answers, ['documents']),
    getAttempt(request) > 0
  )
  return { journey, answers, scope, documents }
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

const removeCell = (request, index) => {
  const href = kit.withChangeContext(
    request,
    pagePath(`accompanying-documents/${index}/remove`)
  )
  return (
    `<a class="govuk-link" href="${href}">` +
    `${copy.remove}<span class="govuk-visually-hidden"> ${copy.removeHidden(index + 1)}</span></a>`
  )
}

// The scan-status cell carries the polling contract: the client rewrites the
// tag it holds in place, keyed by upload id.
const statusCell = (entry, scanStatus) => ({
  html: statusTagHtml(scanStatus),
  attributes: entry.uploadId
    ? { 'data-upload-id': entry.uploadId, 'data-scan-status': scanStatus }
    : undefined
})

const documentRows = (request, documents) =>
  documents.map(({ index, entry, scanStatus }) => [
    { text: cellText(entry.accompanyingDocumentReference) },
    { text: cellText(copy.types[entry.accompanyingDocumentType]) },
    { text: dateText(entry.accompanyingDocumentDateOfIssue) },
    statusCell(entry, scanStatus),
    { html: removeCell(request, index) }
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
  const base = kit.withChangeContext(request, pagePath(page.slug))
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
    ...kit.base(copy.title, { backLink: hubPath(), journey }),
    ...extra,
    copy,
    rows: documentRows(request, documents),
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
  const { answers } = await state.get(request, h)
  const documents = await withScanStatus(
    state.collectionView(answers, ['documents']),
    true
  )
  return h.response({ documents: scanned(documents) })
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

const documentAddErrors = (payload, bare) => {
  const { errors } = validate(fields, payload)
  return {
    ...errors,
    ...presenceErrors(bare),
    ...fileErrors(payload.file)
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
  if (pageState.documents.length >= MAX_DOCUMENTS) {
    return render(request, h, pageState, bare, {}, capacityExceededError())
  }
  const allErrors = documentAddErrors(payload, bare)
  if (Object.keys(allErrors).length > 0) {
    return render(request, h, pageState, bare, allErrors)
  }

  const filename = payload.file.filename ?? 'upload'
  const entry = {
    ...bare,
    accompanyingDocumentType: deriveDocumentTypeFromFilename(filename)
  }
  const outcome = await uploadOutcome(pageState, entry, payload.file, filename)
  if (outcome.failed) {
    return render(request, h, pageState, bare, {
      file: UPLOAD_FAILURE_MESSAGE
    })
  }

  await state.appendEntry(request, h, 'documents', {
    ...entry,
    accompanyingDocumentAttachmentType: attachmentTypeFor(filename),
    uploadId: outcome.uploadId,
    filename
  })
  return h.redirect(kit.withChangeContext(request, pagePath(page.slug)))
}

const isStillSettling = (documents) =>
  documents.some((item) => item.scanStatus !== SCAN_STATUS.COMPLETE)

const settlingSummaryErrors = (documents) =>
  documents.some((item) => item.scanStatus === SCAN_STATUS.REJECTED)
    ? []
    : [{ text: CANNOT_CONTINUE_MESSAGE, href: DOCUMENTS_ADDED_ANCHOR }]

const post = async (request, h) => {
  const payload = request.payload ?? {}
  if (payload.action === 'add') return postAdd(request, h, payload)
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

const getRemove = async (request, h) => {
  const index = Number(request.params.index)
  const backToPage = kit.withChangeContext(request, pagePath(page.slug))
  const { answers } = await state.get(request, h)
  const entry = state.collectionView(answers, ['documents'])[index]?.entry
  if (entry?.uploadId) {
    try {
      await documentUploads.remove(entry.uploadId)
    } catch {
      return h.redirect(backToPage)
    }
  }
  await state.removeEntry(request, h, 'documents', index)
  return h.redirect(backToPage)
}

const HTTP_STATUS_PAYLOAD_TOO_LARGE = 413

const isOversizeBoom = (request) =>
  request.response?.isBoom &&
  request.response.output?.statusCode === HTTP_STATUS_PAYLOAD_TOO_LARGE

const handleOversizePayload = async (request, h) => {
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
  )
}

export const routes = [
  { method: 'GET', path: pagePath(page.slug), options: open, handler: get },
  {
    method: 'POST',
    path: pagePath(page.slug),
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
    path: pagePath(`${page.slug}/status`),
    options: open,
    handler: getStatus
  },
  {
    method: 'GET',
    path: pagePath('accompanying-documents/{index}/remove'),
    options: open,
    handler: getRemove
  }
]
