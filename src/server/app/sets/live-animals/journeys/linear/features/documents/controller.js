import Joi from 'joi'

import { pagePath, pageRoutePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { routeOptions } from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'
import { documentUploads } from '../../../../../../services/document-uploads/index.js'
import { MAX_DOCUMENTS } from './contracts/max-documents.js'
import { isRemoveAction, removeIndexOf } from './contracts/remove-action.js'
import { UPLOAD_ID_PATTERN, ownsUpload } from './contracts/upload-id.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import {
  capacityExceededFieldErrors,
  documentAddErrors
} from './form/errors.js'
import {
  EMPTY_FORM,
  documentFromPayload,
  pendingDocumentSaveFrom,
  startsADocument
} from './form/payload.js'
import { loadPage } from './handlers/load-page.js'
import { fileResponse, uploadDetails } from './handlers/reads/download.js'
import { documentsPage as page } from './page.js'
import { validation } from './validate.js'
import {
  hasDocumentsNotClearedByScan,
  scanned,
  scansNotCleared,
  withScanStatus
} from './scan/status.js'
import { settlingSummaryErrors } from './scan/summary-errors.js'
import {
  MAX_PAYLOAD_BYTES,
  OVERSIZE_FILE_MESSAGE,
  attachmentTypeFor
} from './upload-config.js'
import { render as renderView } from './view-model/render.js'

export const meta = { ...page, collects: ['documents'], validation }
const view = `${TEMPLATES}/features/documents/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const UPLOAD_FAILURE_MESSAGE = copy.errors.uploadFailed

const HTTP_STATUS_NOT_FOUND = 404
const HTTP_STATUS_PAYLOAD_TOO_LARGE = 413

const render = (request, h, pageState, values, options) =>
  renderView({ view, copy, sharedCopy, request, h, pageState, values, options })

const get = async (request, h) => {
  const pageState = await loadPage(request, h)
  return render(request, h, pageState, EMPTY_FORM)
}

const getStatus = async (request, h) => {
  const { answers, evaluation } = await state.get(request, h)
  const documents = await withScanStatus(
    state.collectionView(answers, ['documents'], evaluation),
    { refresh: true, request }
  )
  return h.response({ documents: scanned(documents) })
}

const getFile = async (request, h) => {
  const { answers, evaluation } = await state.get(request, h)
  const { journeyId, uploadId } = request.params
  if (!ownsUpload(answers, evaluation, uploadId)) {
    request.logger.info(
      { journeyId, uploadId },
      'Document file refused: upload not held by the journey'
    )
    return h.response().code(HTTP_STATUS_NOT_FOUND)
  }
  return fileResponse(h, await documentUploads.streamFile(uploadId))
}

const uploadOutcome = async (request, pageState, entry, file, filename) => {
  try {
    const uploadId = await documentUploads.upload(
      uploadDetails(pageState.journey, entry, file, filename)
    )
    return { uploadId }
  } catch (err) {
    request.logger.warn(
      { journeyId: request.params.journeyId, err },
      'Document upload failed'
    )
    return { failed: true }
  }
}

const pageHref = (request) =>
  kit.withChangeContext(request, pagePath(request.params.journeyId, page.slug))

const backToPage = (request, h) => h.redirect(pageHref(request))

const postAdd = async (request, h, payload, afterSave) => {
  const pageState = await loadPage(request, h)
  const bare = documentFromPayload(payload)
  const pendingDocumentSave = pendingDocumentSaveFrom(payload)
  if (!pendingDocumentSave && pageState.documents.length >= MAX_DOCUMENTS) {
    const errors = capacityExceededFieldErrors()
    kit.logRefusal(request, {
      fieldErrors: errors,
      reason: 'document-limit-reached',
      documentsHeld: pageState.documents.length,
      maxDocuments: MAX_DOCUMENTS
    })
    return render(request, h, pageState, bare, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  const allErrors = documentAddErrors(payload, bare, pendingDocumentSave)
  if (Object.keys(allErrors).length > 0) {
    kit.logRefusal(request, {
      fieldErrors: allErrors,
      reason: 'invalid-document-details'
    })
    return render(request, h, pageState, bare, { errors: allErrors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const filename = pendingDocumentSave?.filename ?? payload.file.filename
  const outcome = pendingDocumentSave
    ? { uploadId: pendingDocumentSave.uploadId }
    : await uploadOutcome(request, pageState, bare, payload.file, filename)
  if (outcome.failed) {
    return render(request, h, pageState, bare, {
      errors: { file: UPLOAD_FAILURE_MESSAGE }
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }

  const savedEntry = {
    ...bare,
    accompanyingDocumentAttachmentType: attachmentTypeFor(filename),
    uploadId: outcome.uploadId,
    filename
  }
  return saveAddedDocument(request, h, pageState, savedEntry, bare, afterSave)
}

const isAlreadySaved = (pageState, uploadId) =>
  pageState.documents.some(
    ({ entry: document }) => document.uploadId === uploadId
  )

const saveAddedDocument = async (
  request,
  h,
  pageState,
  savedEntry,
  bare,
  afterSave
) => {
  const { failure } = await kit.recoverableSave(
    request,
    async () => {
      if (isAlreadySaved(pageState, savedEntry.uploadId)) {
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
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR),
    { action: 'save-document', uploadId: savedEntry.uploadId }
  )
  if (failure) {
    return failure
  }
  return afterSave()
}

const documentAt = (answers, evaluation, index) =>
  state.collectionView(answers, ['documents'], evaluation)[index]?.entry

const renderRemovalLeftToRetry = (
  request,
  h,
  pageState,
  pendingDocumentRemoval
) =>
  render(request, h, pageState, EMPTY_FORM, {
    extra: {
      recoverableError: true,
      pendingDocumentRemoval
    }
  }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)

const retryProjectionSave = async (
  request,
  h,
  pageState,
  pendingDocumentRemoval
) => {
  const { failure } = await kit.recoverableSave(
    request,
    async () => {
      await state.commit(request, h, {
        documents: pageState.answers.documents ?? []
      })
    },
    () =>
      renderRemovalLeftToRetry(request, h, pageState, pendingDocumentRemoval),
    { action: 'remove-document', ...pendingDocumentRemoval }
  )
  if (failure) {
    return failure
  }
  return backToPage(request, h)
}

const postRemove = async (request, h, index, { retryUploadId = null } = {}) => {
  const pageState = await loadPage(request, h)
  const retryIndex = retryUploadId
    ? pageState.documents.findIndex(
        ({ entry: document }) => document.uploadId === retryUploadId
      )
    : index
  if (retryUploadId && retryIndex === -1) {
    request.logger.info(
      { journeyId: request.params.journeyId, index, uploadId: retryUploadId },
      'Document already removed: saving the notification without it'
    )
    return retryProjectionSave(request, h, pageState, {
      index,
      uploadId: retryUploadId
    })
  }

  const entry = documentAt(pageState.answers, pageState.evaluation, retryIndex)
  if (!entry) {
    request.logger.info(
      { journeyId: request.params.journeyId, index },
      'Document removal refused: no document at the index'
    )
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }

  if (entry.uploadId && !retryUploadId) {
    try {
      await documentUploads.remove(entry.uploadId)
    } catch (err) {
      request.logger.warn(
        {
          journeyId: request.params.journeyId,
          uploadId: entry.uploadId,
          err
        },
        'Document not removed: upload service failed, document kept'
      )
      return backToPage(request, h)
    }
  }
  const pendingDocumentRemoval = { index, uploadId: entry.uploadId }
  const { failure } = await kit.recoverableSave(
    request,
    async () => {
      await state.removeEntry(request, h, 'documents', retryIndex)
    },
    () =>
      renderRemovalLeftToRetry(request, h, pageState, pendingDocumentRemoval),
    { action: 'remove-document', ...pendingDocumentRemoval }
  )
  if (failure) {
    return failure
  }

  return backToPage(request, h)
}

const leavePage = async (request, h) => {
  const pageState = await loadPage(request, h)
  if (
    !kit.hubExitTarget(request) &&
    hasDocumentsNotClearedByScan(pageState.documents)
  ) {
    kit.logRefusal(request, {
      fieldErrors: { documents: copy.errors.cannotContinue },
      reason: 'scans-not-cleared',
      scansNotCleared: scansNotCleared(pageState.documents)
    })
    return render(request, h, pageState, EMPTY_FORM, {
      summaryErrors: settlingSummaryErrors(pageState.documents)
    })
  }
  return h.redirect(await kit.nextTarget(request, page, pageState.scope))
}

const continuesADocument = (request, payload) =>
  !kit.hubExitTarget(request) && startsADocument(payload)

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
  if (action === 'add') {
    return postAdd(request, h, payload, () => backToPage(request, h))
  }
  if (isRemoveAction(action)) {
    return postRemove(request, h, removeIndexOf(action))
  }
  if (continuesADocument(request, payload)) {
    return postAdd(request, h, payload, () => backToPage(request, h))
  }
  return leavePage(request, h)
}

const isOversizeBoom = (request) =>
  request.response?.isBoom &&
  request.response.output?.statusCode === HTTP_STATUS_PAYLOAD_TOO_LARGE

export const handleOversizePayload = async (request, h) => {
  if (!isOversizeBoom(request)) {
    return h.continue
  }
  const errors = { file: OVERSIZE_FILE_MESSAGE }
  kit.logRefusal(request, {
    fieldErrors: errors,
    reason: 'upload-over-size-limit'
  })
  const pageState = await loadPage(request, h)
  const crumb =
    request.state?.crumb ?? request.server.plugins.crumb?.generate?.(request, h)
  return render(request, h, pageState, EMPTY_FORM, {
    errors,
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
