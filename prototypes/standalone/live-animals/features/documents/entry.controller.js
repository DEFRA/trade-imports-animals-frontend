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
import * as documentTypes from '../../services/document-types/index.js'

const view = `${TEMPLATES}/features/documents/entry`

const fields = compose(
  oneOf('accompanyingDocumentType', documentTypes.documentTypes()),
  oneOf('accompanyingDocumentAttachmentType', documentTypes.attachmentTypes()),
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
      documentTypes.documentTypes(),
      values.accompanyingDocumentType
    ),
    attachmentTypeItems: selectItems(
      'Select a file type',
      documentTypes.attachmentTypes(),
      values.accompanyingDocumentAttachmentType
    ),
    dateOfIssue: kit.dateField('accompanyingDocumentDateOfIssue', {
      label: 'Date of issue',
      hint: 'For example, 12 12 2025',
      value: values.accompanyingDocumentDateOfIssue ?? {},
      error: errors['accompanyingDocumentDateOfIssue-day']
    })
  })

const getAdd = async (request, h) => {
  await state.get(request, h)
  return render(h, {
    accompanyingDocumentType: '',
    accompanyingDocumentAttachmentType: '',
    accompanyingDocumentReference: '',
    accompanyingDocumentDateOfIssue: {}
  })
}

const postAdd = async (request, h) => {
  const payload = request.payload ?? {}
  const entry = documentFromPayload(payload)
  const { errors } = validate(fields, payload)
  if (errors) return render(h, entry, errors)

  await state.appendEntry(request, h, 'documents', entry)
  return h.redirect(pagePath('accompanying-documents'))
}

const getRemove = async (request, h) => {
  await state.removeEntry(request, h, 'documents', Number(request.params.index))
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
