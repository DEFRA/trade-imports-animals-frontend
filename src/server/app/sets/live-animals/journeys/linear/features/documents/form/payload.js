import {
  compose,
  dateText,
  maxText,
  requiredOneOf
} from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { offeredDocumentTypes } from '../contracts/document-type-options.js'
import { UPLOAD_ID_PATTERN } from '../contracts/upload-id.js'
import { attachmentTypeFor } from '../upload-config.js'

const copy = copyFor({ en, cy })

export const REFERENCE_MAX_LENGTH = 58

// Built per add, not frozen at module load: the offered types are
// service-backed and the list is primed at boot. The order is the order the
// fields appear on the page, so the error summary reads down the form.
export const fields = () =>
  compose(
    maxText(
      'accompanyingDocumentReference',
      REFERENCE_MAX_LENGTH,
      copy.errors.referenceMaxLength
    ),
    // One message covers both mistakes a select can make: left on the
    // placeholder, or carrying a value the page never offered.
    requiredOneOf(
      'accompanyingDocumentType',
      offeredDocumentTypes(),
      copy.errors.typeRequired
    ),
    dateText('accompanyingDocumentDateOfIssue', copy.errors.dateInvalid)
  )

export const documentFromPayload = (payload) => ({
  accompanyingDocumentReference: (
    payload.accompanyingDocumentReference ?? ''
  ).trim(),
  accompanyingDocumentType: (payload.accompanyingDocumentType ?? '').trim(),
  accompanyingDocumentDateOfIssue: kit.readDate(
    payload,
    'accompanyingDocumentDateOfIssue'
  )
})

export const EMPTY_FORM = {
  accompanyingDocumentReference: '',
  accompanyingDocumentType: '',
  accompanyingDocumentDateOfIssue: {}
}

export const pendingDocumentSaveFrom = (payload) => {
  const uploadId = payload.retryUploadId ?? ''
  const filename = payload.retryFilename ?? ''
  return UPLOAD_ID_PATTERN.test(uploadId) && attachmentTypeFor(filename)
    ? { uploadId, filename }
    : null
}
