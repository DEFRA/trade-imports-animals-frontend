import * as state from '../../../../../../engine/index.js'
import { isBlank } from '../../../../../../lib/answered.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  dateText,
  maxText,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import {
  documentTypeLabel,
  documentTypeOptions
} from '../../../../services/reference/document-types.js'
import { TEMPLATES } from '../../config.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { accompanyingDocumentsPage as page } from './page.js'

export const meta = { ...page, collects: ['accompanyingDocuments'] }

const view = `${TEMPLATES}/features/documents/template`
const copy = copyFor({ en, cy })

const emptyEntry = () => ({
  documentType: '',
  documentReference: '',
  issueDate: ''
})

const rawEntryFrom = (payload) => ({
  documentType: payload.documentType ?? '',
  documentReference: payload.documentReference ?? '',
  issueDate: payload.issueDate ?? ''
})

const entryFrom = (payload) => ({
  documentType: String(payload.documentType ?? '').trim(),
  documentReference: String(payload.documentReference ?? '').trim(),
  issueDate: kit.readDate(payload, 'issueDate')
})

const documentFields = (documentTypeCodes) =>
  compose(
    requiredOneOf(
      'documentType',
      documentTypeCodes,
      copy.errors.documentTypeRequired
    ),
    maxText('documentReference', 100, copy.errors.referenceMaxLength),
    dateText('issueDate', copy.errors.dateInvalid)
  )

const presenceErrors = (entry) => ({
  ...(entry.documentReference
    ? {}
    : { documentReference: copy.errors.referenceRequired }),
  ...(isBlank(entry.issueDate) ? { issueDate: copy.errors.dateRequired } : {})
})

const displayDate = (value) =>
  [value?.day, value?.month, value?.year]
    .map((part) => String(part ?? ''))
    .join('/')

const rowsFrom = ({ answers, evaluation }) =>
  state
    .collectionView(answers, ['accompanyingDocuments'], evaluation)
    .map(({ index, entry }) => ({
      index,
      documentType:
        documentTypeLabel(entry.documentType) ?? entry.documentType ?? '',
      documentReference: entry.documentReference ?? '',
      issueDate: displayDate(entry.issueDate)
    }))

const selectItems = (selected) => [
  {
    value: '',
    text: copy.placeholderOption,
    selected: selected === ''
  },
  ...documentTypeOptions.map((option) => ({
    ...option,
    selected: option.value === selected
  })),
  ...(selected && !documentTypeOptions.some(({ value }) => value === selected)
    ? [{ value: selected, text: selected, selected: true, disabled: true }]
    : [])
]

const render = (
  request,
  h,
  pageState,
  values = emptyEntry(),
  { errors = {}, recoverableError = false } = {}
) => {
  const base = kit.base(copy.pageTitle, {
    backLink: kit.withChangeContext(
      request,
      hubPath(pageState.journey.journeyId)
    ),
    journey: pageState.journey,
    recoverableError
  })
  return h.view(view, {
    ...base,
    hubHref: kit.withChangeContext(request, base.hubHref),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    documentTypeItems: selectItems(values.documentType),
    issueDate: kit.dateField('issueDate', {
      label: copy.labels.issueDate,
      hint: copy.hints.issueDate,
      value: values.issueDate,
      error: errors.issueDate
    }),
    rows: rowsFrom(pageState)
  })
}

const get = async (request, h) => {
  const pageState = await state.get(request, h)
  return render(request, h, pageState)
}

const redirectToPage = (request, h) =>
  h.redirect(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    )
  )

const postAdd = async (request, h, payload) => {
  const pageState = await state.get(request, h)
  const rawEntry = rawEntryFrom(payload)
  const entry = entryFrom(payload)
  const documentTypeCodes = documentTypeOptions.map(({ value }) => value)
  const { errors: fieldErrors = {} } = validate(
    documentFields(documentTypeCodes),
    payload
  )
  const errors = { ...fieldErrors, ...presenceErrors(entry) }
  if (Object.keys(errors).length > 0) {
    return render(request, h, pageState, rawEntry, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const { failure } = await kit.recoverableSave(
    () =>
      state.appendEntry(request, h, 'accompanyingDocuments', {
        documentType: entry.documentType,
        documentReference: entry.documentReference,
        issueDate: entry.issueDate
      }),
    () =>
      render(request, h, pageState, rawEntry, {
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure

  return redirectToPage(request, h)
}

const removeIndexOf = (action) => {
  const match = String(action).match(/^remove:(0|[1-9]\d*)$/)
  return match ? Number(match[1]) : null
}

const postRemove = async (request, h, action) => {
  const pageState = await state.get(request, h)
  const index = removeIndexOf(action)
  const document =
    index === null
      ? undefined
      : state
          .collectionView(
            pageState.answers,
            ['accompanyingDocuments'],
            pageState.evaluation
          )
          .find((entry) => entry.index === index)
  if (!document) return h.response().code(HTTP_STATUS_BAD_REQUEST)

  await state.removeEntry(request, h, 'accompanyingDocuments', index)
  return redirectToPage(request, h)
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const action = String(payload.action ?? '')
  if (action === 'add') return postAdd(request, h, payload)
  if (action.startsWith('remove:')) return postRemove(request, h, action)

  const pageState = await state.get(request, h)
  const hubTarget = kit.hubExitTarget(request)
  return h.redirect(
    hubTarget ?? (await kit.nextTarget(request, page, pageState.scope))
  )
}

export const routes = kit.pageRoutes(page, { get, post })
