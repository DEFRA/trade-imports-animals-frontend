import {
  compose,
  pageValidation
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as documentTypes from '../../../../../../services/document-types/index.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

// Full catalogue, not the offered subset — a stored `HEALTH_CERTIFICATE` is
// retained-but-not-offered (see contracts/document-type-options.js), so it is
// still valid data, it just cannot be re-picked.
const isStaleType = (validTypes, doc) =>
  !validTypes.has(doc.accompanyingDocumentType)

const isStaleAttachment = (validAttachments, doc) =>
  !validAttachments.has(doc.accompanyingDocumentAttachmentType)

const listErrors = (documents) => {
  const validTypes = new Set(documentTypes.documentTypes())
  const validAttachments = new Set(documentTypes.attachmentTypes())
  const stale = documents.some(
    (doc) =>
      isStaleType(validTypes, doc) || isStaleAttachment(validAttachments, doc)
  )
  return stale ? { documents: copy.errors.someNoLongerValid } : {}
}

export const validation = pageValidation({
  // Add-time rules for a new document live in form/errors.js — the submit
  // reading here is a no-op.
  fields: () => compose(),
  checks: (values, { stored } = {}) =>
    stored ? listErrors(values.documents) : {},
  fromPayload: () => ({ documents: [] }),
  fromAnswers: (answers) => ({
    documents: [answers.documents ?? []].flat()
  })
})
