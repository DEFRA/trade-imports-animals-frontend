import Joi from 'joi'

import { pageRoutePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_FOUND
} from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { routeOptions } from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'
import { documentUploads } from '../../../../../../services/document-uploads/index.js'
import { atDocumentCapacity } from './contracts/max-documents.js'
import { isRemoveAction, removeIndexOf } from './contracts/remove-action.js'
import { UPLOAD_ID_PATTERN, ownsUpload } from './contracts/upload-id.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import {
  documentsPageHref,
  isCorrelationHandle,
  returnedCorrelationId
} from './contracts/upload-session.js'
import {
  capacityExceededError,
  documentAddErrors,
  fileRequiredFieldError
} from './form/errors.js'
import {
  EMPTY_FORM,
  documentFromPayload,
  startsADocument
} from './form/payload.js'
import { claimUpload } from './handlers/claim-upload.js'
import { loadPage } from './handlers/load-page.js'
import { addFormSession } from './handlers/add-form-session.js'
import { fileResponse } from './handlers/reads/download.js'
import { unsavedClaimedUpload } from './handlers/unsaved-claim.js'
import { documentsPage as page } from './page.js'
import { validation } from './validate.js'
import {
  hasRejectedDocuments,
  rejectedScans,
  scanned,
  withScanStatus
} from './scan/status.js'
import { rejectedErrors } from './scan/summary-errors.js'
import { render as renderView } from './view-model/render.js'

export const meta = { ...page, collects: ['documents'], validation }
const view = `${TEMPLATES}/features/documents/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const render = (request, h, pageState, values, options) =>
  renderView({ view, copy, sharedCopy, request, h, pageState, values, options })

const addFormSessionFields = async (request, journeyId) => {
  try {
    return await addFormSession(request, journeyId)
  } catch (err) {
    request.logger.error(
      { err, status: err.status, journeyId },
      'Could not open an upload session'
    )
    return {}
  }
}

const get = async (request, h) => {
  const pageState = await loadPage(request, h)
  const correlationId = returnedCorrelationId(request)
  if (correlationId) {
    return claimReturnedUpload(request, h, pageState, correlationId)
  }
  const addForm = await addFormSessionFields(
    request,
    pageState.journey.journeyId
  )
  return render(request, h, pageState, EMPTY_FORM, { extra: addForm })
}

const renderAfterServiceFailure = async (
  request,
  h,
  pageState,
  values,
  { unsavedDocument } = {}
) =>
  (
    await render(request, h, pageState, values, {
      extra: {
        recoverableError: true,
        unsavedDocument,
        ...(await addFormSessionFields(request, pageState.journey.journeyId))
      }
    })
  ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)

const renderRefusedClaim = async (request, h, pageState, claimed) =>
  (
    await render(request, h, pageState, claimed.values, {
      errors: claimed.errors ?? {},
      summaryErrors: claimed.summaryErrors ?? [],
      extra: await addFormSessionFields(request, pageState.journey.journeyId)
    })
  ).code(HTTP_STATUS_BAD_REQUEST)

const saveClaimedEntry = (request, h, pageState, entry, correlationId) =>
  kit.recoverableSave(
    request,
    async () => {
      await state.appendEntry(request, h, 'documents', entry)
    },
    async (err) => {
      request.logger.error(
        {
          err,
          journeyId: pageState.journey.journeyId,
          uploadId: entry.uploadId,
          correlationId
        },
        'Took on the returned upload but could not save the document'
      )
      return renderAfterServiceFailure(request, h, pageState, EMPTY_FORM, {
        unsavedDocument: { uploadId: entry.uploadId, correlationId }
      })
    },
    {
      action: 'save-document-taken-on',
      uploadId: entry.uploadId,
      correlationId
    }
  )

const routeAfterClaim = (request, h, { saveChoice, addsAnother }) =>
  addsAnother ? backToPage(request, h) : leavePage(request, h, saveChoice)

const claimReturnedUpload = async (request, h, pageState, correlationId) => {
  const claimed = await claimUpload(request, correlationId, pageState)
  if (!claimed) {
    return backToPage(request, h)
  }
  if (claimed.takeOnFailed) {
    return renderAfterServiceFailure(
      request,
      h,
      pageState,
      claimed.values ?? EMPTY_FORM
    )
  }
  if (claimed.errors || claimed.summaryErrors) {
    return renderRefusedClaim(request, h, pageState, claimed)
  }
  if (claimed.entry && !isAlreadySaved(pageState, claimed.entry.uploadId)) {
    const { failure } = await saveClaimedEntry(
      request,
      h,
      pageState,
      claimed.entry,
      correlationId
    )
    if (failure) {
      return failure
    }
  }
  return routeAfterClaim(request, h, claimed)
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

const backToPage = (request, h) =>
  h.redirect(documentsPageHref(request, request.params.journeyId))

const isAlreadySaved = (pageState, uploadId) =>
  pageState.documents.some(
    ({ entry: document }) => document.uploadId === uploadId
  )

const documentAt = (answers, evaluation, index) =>
  state.collectionView(answers, ['documents'], evaluation)[index]?.entry

const renderRemovalLeftToRetry = async (
  request,
  h,
  pageState,
  pendingDocumentRemoval
) =>
  (
    await render(request, h, pageState, EMPTY_FORM, {
      extra: {
        recoverableError: true,
        pendingDocumentRemoval,
        ...(await addFormSessionFields(request, pageState.journey.journeyId))
      }
    })
  ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)

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
    { action: 'save-document-removal', ...pendingDocumentRemoval }
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

const continueToNextPage = async (request, h, pageState, saveChoice) =>
  h.redirect(
    await kit.nextTarget(request, page, pageState.scope, { saveChoice })
  )

const renderRejectedDocumentRefusal = async (request, h, pageState) => {
  kit.logRefusal(request, {
    fieldErrors: { documents: rejectedErrors(pageState.documents) },
    reason: 'scan-rejected',
    rejectedScans: rejectedScans(pageState.documents)
  })
  return (
    await render(request, h, pageState, EMPTY_FORM, {
      extra: await addFormSessionFields(request, pageState.journey.journeyId)
    })
  ).code(HTTP_STATUS_BAD_REQUEST)
}

const leavePage = async (request, h, saveChoice) => {
  const pageState = await loadPage(request, h)
  if (saveChoice.hubExit) {
    return continueToNextPage(request, h, pageState, saveChoice)
  }
  if (hasRejectedDocuments(pageState.documents)) {
    return renderRejectedDocumentRefusal(request, h, pageState)
  }
  const unsaved = await unsavedClaimedUpload(request, pageState)
  if (unsaved.uploadId) {
    kit.logRefusal(request, {
      reason: 'document-taken-on-but-not-listed',
      uploadId: unsaved.uploadId,
      correlationId: unsaved.correlationId
    })
  }
  if (unsaved.uploadId || unsaved.unchecked) {
    return renderAfterServiceFailure(request, h, pageState, EMPTY_FORM, {
      unsavedDocument: unsaved
    })
  }
  return continueToNextPage(request, h, pageState, saveChoice)
}

const refuseUnaddedDocument = async (request, h, payload) => {
  const pageState = await loadPage(request, h)
  const journeyId = pageState.journey.journeyId
  const values = documentFromPayload(payload)
  const addForm = await addFormSessionFields(request, journeyId)
  if (atDocumentCapacity(pageState.documents)) {
    request.logger.info(
      { journeyId },
      'Continue refused: the notification is at its document capacity'
    )
    return (
      await render(request, h, pageState, values, {
        summaryErrors: capacityExceededError(),
        extra: addForm
      })
    ).code(HTTP_STATUS_BAD_REQUEST)
  }
  const errors = documentAddErrors(
    payload,
    values,
    addForm.uploadPath ? fileRequiredFieldError() : {}
  )
  return (
    await render(request, h, pageState, values, {
      errors,
      extra: addForm
    })
  ).code(HTTP_STATUS_BAD_REQUEST)
}

const retryTakingOnTheUpload = async (request, h, correlationId) => {
  const pageState = await loadPage(request, h)
  request.logger.info(
    { journeyId: pageState.journey.journeyId, correlationId },
    'Taking on the returned upload again, to save the document it was taken on for'
  )
  return claimReturnedUpload(request, h, pageState, correlationId)
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const action = payload.action ?? ''
  if (isCorrelationHandle(payload.retryAddCorrelationId)) {
    return retryTakingOnTheUpload(request, h, payload.retryAddCorrelationId)
  }
  if (
    payload.retryRemoveUploadId &&
    UPLOAD_ID_PATTERN.test(payload.retryRemoveUploadId)
  ) {
    return postRemove(request, h, Number(payload.retryRemoveIndex), {
      retryUploadId: payload.retryRemoveUploadId
    })
  }
  if (isRemoveAction(action)) {
    return postRemove(request, h, removeIndexOf(action))
  }
  if (startsADocument(payload)) {
    return refuseUnaddedDocument(request, h, payload)
  }
  return leavePage(request, h, kit.requestSaveChoice(request))
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
    options: routeOptions,
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
