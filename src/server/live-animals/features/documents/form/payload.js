import { compose, dateParts, maxText } from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { UPLOAD_ID_PATTERN } from '../contracts/upload-id.js'
import { attachmentTypeFor } from '../upload-config.js'

const copy = copyFor({ en, cy })

export const fields = compose(
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

export const EMPTY_FORM = {
  accompanyingDocumentReference: '',
  accompanyingDocumentDateOfIssue: {}
}

export const pendingDocumentSaveFrom = (payload) => {
  const uploadId = payload.retryUploadId ?? ''
  const filename = payload.retryFilename ?? ''
  return UPLOAD_ID_PATTERN.test(uploadId) && attachmentTypeFor(filename)
    ? { uploadId, filename }
    : null
}
