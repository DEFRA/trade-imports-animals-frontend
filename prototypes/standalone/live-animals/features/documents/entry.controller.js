import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  compose,
  dateParts,
  maxText,
  oneOf,
  validate
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'

/**
 * Vendored stand-in for the MDM document-type reference list — the V4
 * fourteen-entry enum, verbatim (spec ruling c-010: V4 wins over the
 * skeleton's two-type shortcut).
 */
export const DOCUMENT_TYPE_OPTIONS = [
  'ITAHC',
  'Veterinary health certificate',
  'Air waybill',
  'Import permit',
  'Letter of authority (Directive 2008/61/EC)',
  'Commercial invoice',
  'Sea waybill',
  'Rail waybill',
  'Bill of lading',
  'Catch certificate',
  'Laboratory sampling results for aflatoxin (Reg 2019/1793)',
  'Health certificate',
  'Journey log',
  'Other'
]

// V4 models the attachment as a user-selected file-format enum; the real
// service uploads a file instead (spec ruling c-004: files persist by
// reference in a separate store). This prototype records metadata only.
export const ATTACHMENT_TYPE_OPTIONS = [
  'PDF',
  'DOC',
  'DOCX',
  'JPG',
  'JPEG',
  'PNG',
  'XLS',
  'XLSX'
]

const view = `${TEMPLATES}/features/documents/entry`

// Every document field is enforcedAt=submit (V4 all-or-nothing block):
// blank passes validation and stays an open requirement for the entry's
// completeness roll-up. Only malformed values block the add.
const fields = compose(
  oneOf('accompanyingDocumentType', DOCUMENT_TYPE_OPTIONS),
  oneOf('accompanyingDocumentAttachmentType', ATTACHMENT_TYPE_OPTIONS),
  maxText(
    'accompanyingDocumentReference',
    58,
    'Document reference must be 58 characters or fewer'
  ),
  dateParts('accompanyingDocumentDateOfIssue', 'Enter a real date of issue')
)

const selectItems = (placeholder, options, selected) => [
  { value: '', text: placeholder },
  ...options.map((value) => ({
    value,
    text: value,
    selected: value === selected
  }))
]

export const documentFromPayload = (payload) => ({
  accompanyingDocumentType: payload.accompanyingDocumentType ?? '',
  accompanyingDocumentAttachmentType:
    payload.accompanyingDocumentAttachmentType ?? '',
  accompanyingDocumentReference: (
    payload.accompanyingDocumentReference ?? ''
  ).trim(),
  accompanyingDocumentDateOfIssue: kit.readDate(
    payload,
    'accompanyingDocumentDateOfIssue'
  )
})

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Add a document', {
      backLink: pagePath('accompanying-documents')
    }),
    heading: 'Add a document',
    buttonText: 'Add document',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    typeItems: selectItems(
      'Select a document type',
      DOCUMENT_TYPE_OPTIONS,
      values.accompanyingDocumentType
    ),
    attachmentTypeItems: selectItems(
      'Select a file type',
      ATTACHMENT_TYPE_OPTIONS,
      values.accompanyingDocumentAttachmentType
    ),
    dateOfIssue: kit.dateField('accompanyingDocumentDateOfIssue', {
      label: 'Date of issue',
      hint: 'For example, 12 12 2025',
      value: values.accompanyingDocumentDateOfIssue ?? {},
      error: errors['accompanyingDocumentDateOfIssue-day']
    })
  })

const getAdd = (request, h) => {
  state.get(request, h)
  return render(h, {
    accompanyingDocumentType: '',
    accompanyingDocumentAttachmentType: '',
    accompanyingDocumentReference: '',
    accompanyingDocumentDateOfIssue: {}
  })
}

const postAdd = (request, h) => {
  const payload = request.payload ?? {}
  const entry = documentFromPayload(payload)
  const { errors } = validate(fields, payload)
  if (errors) return render(h, entry, errors)

  // MINTS the index (identity)
  state.appendEntry(request, h, 'documents', entry)
  return h.redirect(pagePath('accompanying-documents'))
}

const getRemove = (request, h) => {
  state.removeEntry(request, h, 'documents', Number(request.params.index))
  return h.redirect(pagePath('accompanying-documents'))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('accompanying-documents/add'),
    options: open,
    handler: getAdd
  },
  {
    method: 'POST',
    path: pagePath('accompanying-documents/add'),
    options: open,
    handler: postAdd
  },
  {
    method: 'GET',
    path: pagePath('accompanying-documents/{index}/remove'),
    options: open,
    handler: getRemove
  }
]
