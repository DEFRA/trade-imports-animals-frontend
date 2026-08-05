import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import { routeOptions } from '../../../../../../shared/kit.js'
import { pagePath, pageRoutePath } from '../../../../../../shared/paths.js'
import { documentUploads } from '../../../../services/document-uploads/index.js'
import { TEMPLATES } from '../../config.js'
import { DOCUMENTS_ADDED_ANCHOR } from './contracts/documents-added-anchor.js'
import { isRemoveAction, removeIndexOf } from './contracts/remove-action.js'
import {
  isOwnedByJourney,
  isSafeUploadId,
  ownedDocument
} from './contracts/upload-id.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import {
  capacityExceededError,
  documentAddErrors,
  hasFilePart,
  isAtCapacity
} from './form/errors.js'
import {
  EMPTY_FORM,
  claimedUploadFrom,
  documentFromPayload,
  rawDocumentFrom
} from './form/payload.js'
import { loadPage } from './handlers/load-page.js'
import { fileResponse } from './handlers/reads/download.js'
import { uploadDocumentFile } from './handlers/writes/upload.js'
import { accompanyingDocumentsPage as page } from './page.js'
import { SCAN_STATUS } from './scan-poll.js'
import { isStillSettling, scanStatusOf } from './scan/status.js'
import { settlingSummaryErrors } from './scan/summary-errors.js'
import { MAX_PAYLOAD_BYTES, OVERSIZE_FILE_MESSAGE } from './upload-config.js'
import { render as renderView } from './view-model/render.js'

export const meta = { ...page, collects: ['accompanyingDocuments'] }

const view = `${TEMPLATES}/features/documents/template`
const copy = copyFor({ en, cy })

const HTTP_STATUS_PAYLOAD_TOO_LARGE = 413
const HTTP_STATUS_NOT_FOUND = 404

const render = (request, h, pageState, values = EMPTY_FORM, options) =>
  renderView(view, request, h, pageState, values, options)

const redirectToPage = (request, h) =>
  h.redirect(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    )
  )

const get = async (request, h) => render(request, h, await loadPage(request, h))

const notFound = (h) => h.response().code(HTTP_STATUS_NOT_FOUND)

// Every refusal is a 404, never a 403 — a 403 would confirm that the upload id
// somebody guessed exists. The guards run shape, then ownership, then scan
// verdict, so a malformed id never reaches the upload service at all.
const getFile = async (request, h) => {
  const { uploadId } = request.params
  if (!isSafeUploadId(uploadId)) return notFound(h)

  const { answers, evaluation } = await state.get(request, h)
  const document = ownedDocument(answers, evaluation, uploadId)
  if (!document) return notFound(h)

  const scanStatus = await scanStatusOf(document.entry)
  if (scanStatus !== SCAN_STATUS.COMPLETE) return notFound(h)

  return fileResponse(h, await documentUploads.streamFile(uploadId))
}

// A retry may only reuse an upload the backend agrees belongs to this journey —
// the hidden field itself proves nothing.
const verifiedRetry = async (payload, journey) => {
  const claimed = claimedUploadFrom(payload)
  // A retry field that fails the shape or filename guards is still a claim, so
  // it is refused rather than degrading into an ordinary fileless Add.
  if (!claimed) return { claimed: Boolean(payload.retryUploadId), retry: null }
  const owned = await isOwnedByJourney(claimed.uploadId, journey.journeyId)
  return { claimed, retry: owned ? claimed : null }
}

const isAlreadySaved = (documents, uploadId) =>
  documents.some(({ entry }) => entry.uploadId === uploadId)

const uploadOutcome = async (journey, entry, file) => {
  try {
    return {
      upload: {
        uploadId: await uploadDocumentFile(journey, entry, file),
        filename: file.filename
      }
    }
  } catch {
    return { failed: true }
  }
}

const saveDocument = async (request, h, pageState, raw, savedEntry, upload) => {
  const { failure } = await kit.recoverableSave(
    () => state.appendEntry(request, h, 'accompanyingDocuments', savedEntry),
    () =>
      render(request, h, pageState, raw, {
        recoverableError: true,
        pendingUpload: upload
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  return failure ?? redirectToPage(request, h)
}

const postAdd = async (request, h, payload) => {
  const pageState = await loadPage(request, h)
  const raw = rawDocumentFrom(payload)
  const entry = documentFromPayload(payload)
  const { claimed, retry } = await verifiedRetry(payload, pageState.journey)

  if (claimed && !retry) {
    return render(request, h, pageState, raw, {
      errors: { file: copy.errors.uploadFailed }
    }).code(HTTP_STATUS_BAD_REQUEST)
  }

  const alreadyLanded =
    Boolean(retry) && isAlreadySaved(pageState.documents, retry.uploadId)

  if (!alreadyLanded && isAtCapacity(pageState.documents)) {
    return render(request, h, pageState, raw, {
      summaryErrors: capacityExceededError()
    }).code(HTTP_STATUS_BAD_REQUEST)
  }

  // The row already landed — the failure the user saw came back after the
  // write, so resubmitting must not append a second copy of it.
  if (alreadyLanded) return redirectToPage(request, h)

  const errors = documentAddErrors(payload, entry, retry)
  if (Object.keys(errors).length > 0) {
    return render(request, h, pageState, raw, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let upload = retry
  if (!upload && hasFilePart(payload.file)) {
    const outcome = await uploadOutcome(pageState.journey, entry, payload.file)
    if (outcome.failed) {
      return render(request, h, pageState, raw, {
        errors: { file: copy.errors.uploadFailed }
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
    upload = outcome.upload
  }

  return saveDocument(
    request,
    h,
    pageState,
    raw,
    {
      documentType: entry.documentType,
      documentReference: entry.documentReference,
      issueDate: entry.issueDate,
      ...(upload
        ? { uploadId: upload.uploadId, filename: upload.filename }
        : {})
    },
    upload
  )
}

const postRemove = async (request, h, action) => {
  const pageState = await loadPage(request, h)
  const index = removeIndexOf(action)
  const document =
    index === null
      ? undefined
      : pageState.documents.find((item) => item.index === index)
  if (!document) return h.response().code(HTTP_STATUS_BAD_REQUEST)

  if (document.entry.uploadId) {
    try {
      await documentUploads.remove(document.entry.uploadId)
    } catch {
      return render(request, h, pageState, EMPTY_FORM, {
        summaryErrors: [
          { text: copy.errors.removeFailed, href: DOCUMENTS_ADDED_ANCHOR }
        ]
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  }

  const { failure } = await kit.recoverableSave(
    () => state.removeEntry(request, h, 'accompanyingDocuments', index),
    () =>
      render(request, h, pageState, EMPTY_FORM, {
        summaryErrors: [
          { text: copy.errors.removeFailed, href: DOCUMENTS_ADDED_ANCHOR }
        ]
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  return failure ?? redirectToPage(request, h)
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const action = String(payload.action ?? '')
  if (action === 'add') return postAdd(request, h, payload)
  if (isRemoveAction(action)) return postRemove(request, h, action)

  const pageState = await loadPage(request, h)
  const hubTarget = kit.hubExitTarget(request)
  if (!hubTarget && isStillSettling(pageState.documents)) {
    return render(request, h, pageState, EMPTY_FORM, {
      summaryErrors: settlingSummaryErrors(pageState.documents)
    })
  }
  return h.redirect(
    hubTarget ?? (await kit.nextTarget(request, page, pageState.scope))
  )
}

const isOversizeBoom = (request) =>
  request.response?.isBoom &&
  request.response.output?.statusCode === HTTP_STATUS_PAYLOAD_TOO_LARGE

// A route-level payload rejection never reaches the handler, so it is rewritten
// into the ordinary linked-error re-render rather than a bare 413.
export const handleOversizePayload = async (request, h) => {
  if (!isOversizeBoom(request)) return h.continue
  const pageState = await loadPage(request, h)
  const crumb =
    request.state?.crumb ?? request.server.plugins.crumb?.generate?.(request, h)
  return render(request, h, pageState, EMPTY_FORM, {
    errors: { file: OVERSIZE_FILE_MESSAGE },
    crumb
  }).code(HTTP_STATUS_BAD_REQUEST)
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath(page.slug),
    options: routeOptions,
    handler: get
  },
  {
    method: 'POST',
    path: pageRoutePath(page.slug),
    options: {
      ...routeOptions,
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
    path: pageRoutePath(`${page.slug}/{uploadId}/file`),
    options: routeOptions,
    handler: getFile
  }
]
