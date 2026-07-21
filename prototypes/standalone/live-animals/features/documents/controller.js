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
  attachmentTypeFor
} from './upload-config.js'
import { documentsPage as page } from './page.js'

export const meta = { ...page, collects: ['documents'] }
const view = `${TEMPLATES}/features/documents/template`

export const MAX_DOCUMENTS = maxDocuments()
export const MAX_POLLING_ATTEMPTS = 10

const NOT_PROVIDED = 'Not provided'
const CANNOT_CONTINUE_MESSAGE =
  'You cannot continue until all documents have been scanned or removed'
const UPLOAD_FAILURE_MESSAGE = 'The file could not be uploaded. Try again.'

const fields = compose(
  maxText(
    'accompanyingDocumentReference',
    58,
    'Document reference must be 58 characters or fewer'
  ),
  dateParts('accompanyingDocumentDateOfIssue', 'Enter a real date of issue')
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
    : { accompanyingDocumentReference: 'Enter a document reference' }),
  ...(isBlank(entry.accompanyingDocumentDateOfIssue)
    ? { 'accompanyingDocumentDateOfIssue-day': 'Enter the date of issue' }
    : {})
})

const EMPTY_FORM = {
  accompanyingDocumentReference: '',
  accompanyingDocumentDateOfIssue: {}
}

export const fileErrors = (file) => {
  if (!file?.payload?.length) return { file: 'Select a file to upload' }
  if (file.payload.length > MAX_FILE_SIZE_BYTES) {
    return { file: OVERSIZE_FILE_MESSAGE }
  }
  if (!attachmentTypeFor(file.filename ?? '')) {
    return { file: FILE_TYPE_MESSAGE }
  }
  return {}
}

const scanStatusOf = async (entry, refresh) => {
  if (!entry.uploadId) return 'COMPLETE'
  try {
    return await documentUploads.scanStatus({
      uploadId: entry.uploadId,
      filename: entry.filename,
      refresh
    })
  } catch {
    return 'PENDING'
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
  COMPLETE: { text: 'Safe', classes: 'govuk-tag--green' },
  REJECTED: { text: 'Virus found', classes: 'govuk-tag--red' },
  PENDING: { text: 'Checking', classes: 'govuk-tag--blue' }
}

const statusTagHtml = (scanStatus) => {
  const tag = SCAN_STATUS_TAGS[scanStatus] ?? {
    text: 'Unknown',
    classes: 'govuk-tag--grey'
  }
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
    `Remove<span class="govuk-visually-hidden"> document ${index + 1}</span></a>`
  )
}

const documentRows = (request, documents) =>
  documents.map(({ index, entry, scanStatus }) => [
    { text: cellText(entry.accompanyingDocumentReference) },
    { text: cellText(entry.accompanyingDocumentType) },
    { text: dateText(entry.accompanyingDocumentDateOfIssue) },
    { html: statusTagHtml(scanStatus) },
    { html: removeCell(request, index) }
  ])

const rejectedErrors = (documents) =>
  documents
    .filter((item) => item.scanStatus === 'REJECTED')
    .map((item) => ({
      text: `${item.entry.filename ?? 'The file'} contains a virus. Remove it and try again with a different file.`,
      href: '#documents-added'
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
  const anyPending = documents.some((item) => item.scanStatus === 'PENDING')
  const errorList = [
    ...rejectedErrors(documents),
    ...summaryErrors,
    ...(kit.errorSummary(errors)?.errorList ?? [])
  ]
  return h.view(view, {
    ...kit.base('Upload documents', { backLink: hubPath(), journey }),
    ...extra,
    heading: 'Upload documents',
    rows: documentRows(request, documents),
    hasDocuments: documents.length > 0,
    emptyText: 'You have not added any documents yet.',
    values,
    errors,
    errorSummary: errorList.length
      ? { titleText: 'There is a problem', errorList }
      : null,
    anyPending,
    timedOut: anyPending && attempt >= MAX_POLLING_ATTEMPTS,
    refreshHref: refreshHref(request, attempt + 1),
    acceptAttribute: ACCEPT_ATTRIBUTE,
    allowedFileTypesHint: ALLOWED_FILE_TYPES_HINT,
    maxFileSizeLabel: MAX_FILE_SIZE_LABEL,
    dateOfIssue: kit.dateField('accompanyingDocumentDateOfIssue', {
      label: 'Date of issue',
      hint: 'For example, 12 12 2025',
      value: values.accompanyingDocumentDateOfIssue ?? {},
      error: errors['accompanyingDocumentDateOfIssue-day']
    })
  })
}

const isoDate = ({ day, month, year } = {}) =>
  `${String(year ?? '').padStart(4, '0')}-${String(month ?? '').padStart(2, '0')}-${String(day ?? '').padStart(2, '0')}`

const get = async (request, h) => {
  const pageState = await loadPage(request, h)
  return render(request, h, pageState, EMPTY_FORM)
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

const postAdd = async (request, h, payload) => {
  const pageState = await loadPage(request, h)
  const bare = documentFromPayload(payload)
  if (pageState.documents.length >= MAX_DOCUMENTS) {
    return render(request, h, pageState, bare, {}, [
      {
        text: `You can add a maximum of ${MAX_DOCUMENTS} documents`,
        href: '#documents-added'
      }
    ])
  }
  const { errors } = validate(fields, payload)
  const allErrors = {
    ...errors,
    ...presenceErrors(bare),
    ...fileErrors(payload.file)
  }
  if (Object.keys(allErrors).length > 0) {
    return render(request, h, pageState, bare, allErrors)
  }

  const filename = payload.file.filename ?? 'upload'
  const entry = {
    ...bare,
    accompanyingDocumentType: deriveDocumentTypeFromFilename(filename)
  }
  let uploadId
  try {
    uploadId = await documentUploads.upload(
      uploadDetails(pageState.journey, entry, payload.file, filename)
    )
  } catch {
    return render(request, h, pageState, bare, {
      file: UPLOAD_FAILURE_MESSAGE
    })
  }

  await state.appendEntry(request, h, 'documents', {
    ...entry,
    accompanyingDocumentAttachmentType: attachmentTypeFor(filename),
    uploadId,
    filename
  })
  return h.redirect(kit.withChangeContext(request, pagePath(page.slug)))
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  if (payload.action === 'add') return postAdd(request, h, payload)
  const pageState = await loadPage(request, h)
  if (!kit.hubExitTarget(request)) {
    const anyRejected = pageState.documents.some(
      (item) => item.scanStatus === 'REJECTED'
    )
    const anySettling = pageState.documents.some(
      (item) => item.scanStatus !== 'COMPLETE'
    )
    if (anySettling) {
      const summaryErrors = anyRejected
        ? []
        : [{ text: CANNOT_CONTINUE_MESSAGE, href: '#documents-added' }]
      return render(request, h, pageState, EMPTY_FORM, {}, summaryErrors)
    }
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

const isOversizeBoom = (request) =>
  request.response?.isBoom && request.response.output?.statusCode === 413

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
    path: pagePath('accompanying-documents/{index}/remove'),
    options: open,
    handler: getRemove
  }
]
