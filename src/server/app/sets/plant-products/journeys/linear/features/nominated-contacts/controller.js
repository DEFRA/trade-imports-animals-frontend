import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  maxText,
  pattern,
  requiredText,
  validate
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { nominatedContactPage as page } from './page.js'

export const meta = { ...page, collects: ['nominatedContacts'] }

const view = `${TEMPLATES}/features/nominated-contacts/template`
const copy = copyFor({ en, cy })
const MAX_CONTACTS = 5
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TELEPHONE = /^\+?[\d\s]+$/

const emptyEntry = () => ({
  contactName: '',
  contactEmail: '',
  contactTelephone: '',
  contactIsAgent: false
})

const rawEntryFrom = (payload) => ({
  contactName: payload.contactName ?? '',
  contactEmail: payload.contactEmail ?? '',
  contactTelephone: payload.contactTelephone ?? '',
  contactIsAgent: payload.contactIsAgent === 'true'
})

const contactFields = () => [
  requiredText('contactName', copy.errors.contactNameRequired),
  maxText('contactName', 32, copy.errors.contactNameMax),
  pattern('contactEmail', EMAIL, copy.errors.contactEmailFormat),
  maxText('contactEmail', 255, copy.errors.contactEmailMax),
  pattern('contactTelephone', TELEPHONE, copy.errors.contactTelephoneFormat),
  maxText('contactTelephone', 30, copy.errors.contactTelephoneMax)
]

const validateContactFields = (payload) => {
  const results = contactFields().map((rule) => validate(rule, payload))
  const errors = results.reduce((combined, result) => {
    for (const [field, message] of Object.entries(result.errors ?? {})) {
      if (combined[field] === undefined) combined[field] = message
    }
    return combined
  }, {})
  return Object.keys(errors).length > 0 ? errors : null
}

const rowsFrom = ({ answers, evaluation }) =>
  state
    .collectionView(answers, ['nominatedContacts'], evaluation)
    .map(({ index, entry }) => ({
      index,
      number: index + 1,
      contactName: entry.contactName ?? '',
      contactEmail: entry.contactEmail ?? '',
      contactTelephone: entry.contactTelephone ?? ''
    }))

const render = (
  request,
  h,
  pageState,
  values = emptyEntry(),
  { errors = {}, recoverableError = false } = {}
) => {
  const rows = rowsFrom(pageState)
  const base = kit.base(copy.title, {
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
    rows,
    atMax: rows.length >= MAX_CONTACTS
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

const contactFrom = (values, payload) => ({
  contactName: values.contactName,
  ...(values.contactEmail ? { contactEmail: values.contactEmail } : {}),
  ...(values.contactTelephone
    ? { contactTelephone: values.contactTelephone }
    : {}),
  contactIsAgent: payload.contactIsAgent === 'true'
})

const postAdd = async (request, h, payload) => {
  const pageState = await state.get(request, h)
  const savedCount = rowsFrom(pageState).length
  if (savedCount >= MAX_CONTACTS) return redirectToPage(request, h)

  const rawEntry = rawEntryFrom(payload)
  const values = {
    contactName: String(rawEntry.contactName).trim(),
    contactEmail: String(rawEntry.contactEmail).trim(),
    contactTelephone: String(rawEntry.contactTelephone).trim()
  }
  const fieldErrors = validateContactFields(payload)
  const contactMethodMissing = !values.contactEmail && !values.contactTelephone
  const errors = {
    ...(fieldErrors ?? {}),
    ...(contactMethodMissing
      ? { contactEmail: copy.errors.contactMethodRequired }
      : {})
  }
  if (Object.keys(errors).length > 0) {
    return render(request, h, pageState, rawEntry, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const entry = contactFrom(values, payload)
  const { failure } = await kit.recoverableSave(
    () => state.appendEntry(request, h, 'nominatedContacts', entry),
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
  const contact =
    index === null
      ? undefined
      : state
          .collectionView(
            pageState.answers,
            ['nominatedContacts'],
            pageState.evaluation
          )
          .find((entry) => entry.index === index)
  if (!contact) return h.response().code(HTTP_STATUS_BAD_REQUEST)

  const { failure } = await kit.recoverableSave(
    () => state.removeEntry(request, h, 'nominatedContacts', index),
    () =>
      render(request, h, pageState, emptyEntry(), {
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure

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
