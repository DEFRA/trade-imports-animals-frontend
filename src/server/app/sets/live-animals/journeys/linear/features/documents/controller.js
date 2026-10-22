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
import { returnedCorrelationId } from './contracts/upload-session.js'
import {
  capacityExceededError,
  documentAddErrors,
  notYetAddedFileError
} from './form/errors.js'
import {
  EMPTY_FORM,
  documentFromPayload,
  startsADocument
} from './form/payload.js'
import { claimUpload } from './handlers/claim-upload.js'
import { loadPage } from './handlers/load-page.js'
import { openUploadSession } from './handlers/open-upload-session.js'
import { fileResponse } from './handlers/reads/download.js'
import { documentsPage as page } from './page.js'
import { validation } from './validate.js'
import { isStillSettling, scanned, withScanStatus } from './scan/status.js'
import { settlingSummaryErrors } from './scan/summary-errors.js'
import { render as renderView } from './view-model/render.js'

export const meta = { ...page, collects: ['documents'], validation }
const view = `${TEMPLATES}/features/documents/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const HTTP_STATUS_NOT_FOUND = 404

const render = (request, h, pageState, values, options) =>
  renderView({ view, copy, sharedCopy, request, h, pageState, values, options })

// Where the Add form posts its file, or nothing when no session could be opened.
const addFormTarget = async (request, journeyId) => {
  try {
    return await openUploadSession(request, journeyId)
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
  const target = await addFormTarget(request, pageState.journey.journeyId)
  return render(request, h, pageState, EMPTY_FORM, { extra: target })
}

const renderTakeOnFailure = async (request, h, pageState, values) =>
  render(request, h, pageState, values, {
    extra: {
      recoverableError: true,
      ...(await addFormTarget(request, pageState.journey.journeyId))
    }
  }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)

// The upload service returns the browser with a GET, so the document is taken
// on here and answered with a redirect: reloading the clean path cannot claim
// the same upload twice.
const claimReturnedUpload = async (request, h, pageState, correlationId) => {
  const claimed = await claimUpload(request, correlationId, pageState)
  if (claimed?.takeOnFailed) {
    return renderTakeOnFailure(
      request,
      h,
      pageState,
      claimed.values ?? EMPTY_FORM
    )
  }
  if (claimed?.errors || claimed?.summaryErrors) {
    const target = await addFormTarget(request, pageState.journey.journeyId)
    return render(request, h, pageState, claimed.values, {
      errors: claimed.errors ?? {},
      summaryErrors: claimed.summaryErrors ?? [],
      extra: target
    }).code(HTTP_STATUS_BAD_REQUEST)
  }
  if (claimed?.entry && !isAlreadySaved(pageState, claimed.entry.uploadId)) {
    const { failure } = await kit.recoverableSave(
      async () => {
        await state.appendEntry(request, h, 'documents', claimed.entry)
      },
      async (err) => {
        request.logger.error(
          {
            err,
            journeyId: pageState.journey.journeyId,
            uploadId: claimed.entry.uploadId,
            correlationId
          },
          'Took on the returned upload but could not save the document'
        )
        return renderTakeOnFailure(request, h, pageState, EMPTY_FORM)
      }
    )
    if (failure) {
      return failure
    }
  }
  return backToPage(request, h)
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

const pageHref = (request) =>
  kit.withChangeContext(request, pagePath(request.params.journeyId, page.slug))

// The single-page loop: a saved document leaves the trader on the page it was
// added from, ready for the next one.
const backToPage = (request, h) => h.redirect(pageHref(request))

const isAlreadySaved = (pageState, uploadId) =>
  pageState.documents.some(
    ({ entry: document }) => document.uploadId === uploadId
  )

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
    async () =>
      render(request, h, pageState, EMPTY_FORM, {
        extra: {
          recoverableError: true,
          pendingDocumentRemoval,
          ...(await addFormTarget(request, pageState.journey.journeyId))
        }
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
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
    return retryProjectionSave(request, h, pageState, {
      index,
      uploadId: retryUploadId
    })
  }

  const entry = documentAt(pageState.answers, pageState.evaluation, retryIndex)
  if (!entry) {
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }

  if (entry.uploadId && !retryUploadId) {
    try {
      await documentUploads.remove(entry.uploadId)
    } catch {
      return backToPage(request, h)
    }
  }
  const { failure } = await kit.recoverableSave(
    async () => {
      await state.removeEntry(request, h, 'documents', retryIndex)
    },
    async () =>
      render(request, h, pageState, EMPTY_FORM, {
        extra: {
          recoverableError: true,
          pendingDocumentRemoval: {
            index,
            uploadId: entry.uploadId
          },
          ...(await addFormTarget(request, pageState.journey.journeyId))
        }
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return backToPage(request, h)
}

// Leaving the page, once nothing is left to save. A file still being checked
// holds Continue back; the exit to the overview is a deliberate stop and goes.
const leavePage = async (request, h) => {
  const pageState = await loadPage(request, h)
  if (!kit.hubExitTarget(request) && isStillSettling(pageState.documents)) {
    return render(request, h, pageState, EMPTY_FORM, {
      summaryErrors: settlingSummaryErrors(pageState.documents),
      extra: await addFormTarget(request, pageState.journey.journeyId)
    })
  }
  return h.redirect(await kit.nextTarget(request, page, pageState.scope))
}

// Continue carries the add-a-document fields with it, so a part-filled form
// reaching here is a document the trader means to attach. Their answers are
// never dropped: what is missing is said, and a form that only lacks the add
// step asks for it, because the file itself can only go to the upload service.
const continuesADocument = (request, payload) =>
  !kit.hubExitTarget(request) && startsADocument(payload)

const finishTheDocument = async (request, h, payload) => {
  const pageState = await loadPage(request, h)
  const values = documentFromPayload(payload)
  const target = await addFormTarget(request, pageState.journey.journeyId)
  if (pageState.documents.length >= MAX_DOCUMENTS) {
    return render(request, h, pageState, values, {
      summaryErrors: capacityExceededError(),
      extra: target
    }).code(HTTP_STATUS_BAD_REQUEST)
  }
  // The file is always outstanding here: continuing never carries one, and this
  // runs only once the add form has been started. So it is reported alongside
  // whatever else is missing, which is what continuing has to say. Where no
  // session opened there is nothing to press, and the page already refuses the
  // form with its own message, so the file is left out of that one.
  const errors = documentAddErrors(
    payload,
    values,
    target.uploadPath ? notYetAddedFileError() : null
  )
  return render(request, h, pageState, values, {
    errors,
    extra: target
  }).code(HTTP_STATUS_BAD_REQUEST)
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
  if (isRemoveAction(action)) {
    return postRemove(request, h, removeIndexOf(action))
  }
  if (continuesADocument(request, payload)) {
    return finishTheDocument(request, h, payload)
  }
  return leavePage(request, h)
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
