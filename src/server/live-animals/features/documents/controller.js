import Joi from 'joi'

import { pagePath, pageRoutePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../lib/http-status.js'
import * as kit from '../../shared/kit.js'
import { routeOptions } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { copy as sharedEn } from '../../shared/copy.en.js'
import { copy as sharedCy } from '../../shared/copy.cy.js'
import { documentUploads } from '../../services/document-uploads/index.js'
import { MAX_DOCUMENTS } from './contracts/max-documents.js'
import { isRemoveAction, removeIndexOf } from './contracts/remove-action.js'
import { UPLOAD_ID_PATTERN, ownsUpload } from './contracts/upload-id.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
import { deriveDocumentTypeFromFilename } from './derive-document-type.js'
import { capacityExceededError, documentAddErrors } from './form/errors.js'
import {
  EMPTY_FORM,
  documentFromPayload,
  pendingDocumentSaveFrom
} from './form/payload.js'
import { loadPage } from './handlers/load-page.js'
import { fileResponse, uploadDetails } from './handlers/reads/download.js'
import { documentsPage as page } from './page.js'
import { isStillSettling, scanned, withScanStatus } from './scan/status.js'
import { settlingSummaryErrors } from './scan/summary-errors.js'
import {
  MAX_PAYLOAD_BYTES,
  OVERSIZE_FILE_MESSAGE,
  attachmentTypeFor
} from './upload-config.js'
import { render as renderView } from './view-model/render.js'

export const meta = { ...page, collects: ['documents'] }
const view = `${TEMPLATES}/features/documents/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const UPLOAD_FAILURE_MESSAGE = copy.errors.uploadFailed

const HTTP_STATUS_NOT_FOUND = 404
const HTTP_STATUS_PAYLOAD_TOO_LARGE = 413

const render = (request, h, ...args) =>
  renderView(view, copy, sharedCopy, request, h, ...args)

const get = async (request, h) => {
  const pageState = await loadPage(request, h)
  return render(request, h, pageState, EMPTY_FORM)
}

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
    return render(request, h, pageState, bare, {
      summaryErrors: capacityExceededError()
    }).code(HTTP_STATUS_BAD_REQUEST)
  }
  const allErrors = documentAddErrors(payload, bare, pendingDocumentSave)
  if (Object.keys(allErrors).length > 0) {
    return render(request, h, pageState, bare, { errors: allErrors }).code(
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
      errors: { file: UPLOAD_FAILURE_MESSAGE }
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }

  const savedEntry = {
    ...entry,
    accompanyingDocumentAttachmentType: attachmentTypeFor(filename),
    uploadId: outcome.uploadId,
    filename
  }
  const { failure } = await kit.recoverableSave(
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
      render(request, h, pageState, bare, {
        extra: {
          recoverableError: true,
          pendingDocumentSave: {
            uploadId: savedEntry.uploadId,
            filename: savedEntry.filename
          }
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

const documentAt = (answers, evaluation, index) =>
  state.collectionView(answers, ['documents'], evaluation)[index]?.entry

const retryProjectionSave = async (
  request,
  h,
  pageState,
  pendingDocumentRemoval
) => {
  const { failure } = await kit.recoverableSave(
    async () => {
      await state.commit(request, h, {
        documents: pageState.answers.documents ?? []
      })
    },
    () =>
      render(request, h, pageState, EMPTY_FORM, {
        extra: {
          recoverableError: true,
          pendingDocumentRemoval
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
  const { failure } = await kit.recoverableSave(
    async () => {
      await state.removeEntry(request, h, 'documents', retryIndex)
    },
    () =>
      render(request, h, pageState, EMPTY_FORM, {
        extra: {
          recoverableError: true,
          pendingDocumentRemoval: {
            index,
            uploadId: entry.uploadId
          }
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
    return render(request, h, pageState, EMPTY_FORM, {
      summaryErrors: settlingSummaryErrors(pageState.documents)
    })
  }
  return h.redirect(await kit.nextTarget(request, page, pageState.scope))
}

const isOversizeBoom = (request) =>
  request.response?.isBoom &&
  request.response.output?.statusCode === HTTP_STATUS_PAYLOAD_TOO_LARGE

export const handleOversizePayload = async (request, h) => {
  if (!isOversizeBoom(request)) return h.continue
  const pageState = await loadPage(request, h)
  const crumb =
    request.state?.crumb ?? request.server.plugins.crumb?.generate?.(request, h)
  return render(request, h, pageState, EMPTY_FORM, {
    errors: { file: OVERSIZE_FILE_MESSAGE },
    extra: { crumb }
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
    path: pageRoutePath(`${page.slug}/status`),
    options: routeOptions,
    handler: getStatus
  },
  {
    method: 'GET',
    path: pageRoutePath(`${page.slug}/{uploadId}/file`),
    options: {
      ...routeOptions,
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
