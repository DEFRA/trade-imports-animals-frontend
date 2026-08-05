import {
  compose,
  dateText,
  maxText,
  requiredOneOf
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { documentTypeOptions } from '../../../../../services/reference/document-types.js'
import { isSafeUploadId } from '../contracts/upload-id.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { isAllowedFilename } from '../upload-config.js'

const copy = copyFor({ en, cy })

export const DOCUMENT_TYPE_CODES = documentTypeOptions.map(({ value }) => value)

export const fields = compose(
  requiredOneOf(
    'documentType',
    DOCUMENT_TYPE_CODES,
    copy.errors.documentTypeRequired
  ),
  maxText('documentReference', 100, copy.errors.referenceMaxLength),
  dateText('issueDate', copy.errors.dateInvalid)
)

export const EMPTY_FORM = {
  documentType: '',
  documentReference: '',
  issueDate: ''
}

export const rawDocumentFrom = (payload) => ({
  documentType: payload.documentType ?? '',
  documentReference: payload.documentReference ?? '',
  issueDate: payload.issueDate ?? ''
})

export const documentFromPayload = (payload) => ({
  documentType: String(payload.documentType ?? '').trim(),
  documentReference: String(payload.documentReference ?? '').trim(),
  issueDate: kit.readDate(payload, 'issueDate')
})

// Shape only. These fields are attacker-controlled, so the caller must clear
// them through the backend-ownership check before honouring them.
export const claimedUploadFrom = (payload) => {
  const uploadId = payload.retryUploadId ?? ''
  const filename = payload.retryFilename ?? ''
  return isSafeUploadId(uploadId) &&
    typeof filename === 'string' &&
    isAllowedFilename(filename)
    ? { uploadId, filename }
    : null
}
