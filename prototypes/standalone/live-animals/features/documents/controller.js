import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { isBlank } from '../../lib/answered.js'
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
import { documentsPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/documents/template`

export const MAX_DOCUMENTS = 10

const NOT_PROVIDED = 'Not provided'

export const documentValue = (entry) => {
  const type = (entry.accompanyingDocumentType ?? '').trim() || NOT_PROVIDED
  const reference = (entry.accompanyingDocumentReference ?? '').trim()
  return reference ? `${type} — ${reference}` : type
}

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

const EMPTY_FORM = {
  accompanyingDocumentType: '',
  accompanyingDocumentAttachmentType: '',
  accompanyingDocumentReference: '',
  accompanyingDocumentDateOfIssue: {}
}

const cellText = (value) => (value ?? '').trim() || NOT_PROVIDED

const dateText = (value) =>
  isBlank(value) ? NOT_PROVIDED : `${value.day}/${value.month}/${value.year}`

const removeCell = (index) =>
  `<a class="govuk-link" href="${pagePath(`accompanying-documents/${index}/remove`)}">` +
  `Remove<span class="govuk-visually-hidden"> document ${index + 1}</span></a>`

const documentRows = (answers) =>
  state
    .collectionView(answers, ['documents'])
    .map(({ index, entry }) => [
      { text: cellText(entry.accompanyingDocumentReference) },
      { text: cellText(entry.accompanyingDocumentType) },
      { text: dateText(entry.accompanyingDocumentDateOfIssue) },
      { html: removeCell(index) }
    ])

const render = (h, answers, values, errors = {}) => {
  const rows = documentRows(answers)
  return h.view(view, {
    ...kit.base('Upload documents', { backLink: hubPath() }),
    heading: 'Upload documents',
    rows,
    hasDocuments: rows.length > 0,
    emptyText: 'You have not added any documents yet.',
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
}

const get = async (request, h) => {
  const { answers } = await state.get(request, h)
  return render(h, answers, EMPTY_FORM)
}

const postAdd = async (request, h, payload) => {
  const { answers } = await state.get(request, h)
  const entry = documentFromPayload(payload)
  if (state.collectionView(answers, ['documents']).length >= MAX_DOCUMENTS) {
    return render(h, answers, entry, {
      accompanyingDocumentType: `You can add a maximum of ${MAX_DOCUMENTS} documents`
    })
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, answers, entry, errors)

  await state.appendEntry(request, h, 'documents', entry)
  return h.redirect(pagePath(page.slug))
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  if (payload.action === 'add') return postAdd(request, h, payload)
  const { scope } = await state.get(request, h)
  return h.redirect(kit.nextTarget(request, page, scope))
}

const getRemove = async (request, h) => {
  await state.removeEntry(request, h, 'documents', Number(request.params.index))
  return h.redirect(pagePath(page.slug))
}

export const routes = [
  ...kit.pageRoutes(page, { get, post }),
  {
    method: 'GET',
    path: pagePath('accompanying-documents/{index}/remove'),
    options: open,
    handler: getRemove
  }
]
