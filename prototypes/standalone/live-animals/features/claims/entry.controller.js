import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, currency, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'

export const CLAIM_TYPE_OPTIONS = [
  { value: 'accident', text: 'Accident' },
  { value: 'theft', text: 'Theft' },
  { value: 'windscreen', text: 'Windscreen' },
  { value: 'other', text: 'Something else' }
]
export const CLAIM_TYPE_LABEL = Object.fromEntries(
  CLAIM_TYPE_OPTIONS.map((option) => [option.value, option.text])
)

export const WINDSCREEN_PROVIDER_OPTIONS = [
  { value: 'autoglass', text: 'Autoglass' },
  { value: 'national-windscreens', text: 'National Windscreens' },
  { value: 'nationwide', text: 'Nationwide Windscreen Services' }
]
export const WINDSCREEN_PROVIDER_LABEL = Object.fromEntries(
  WINDSCREEN_PROVIDER_OPTIONS.map((option) => [option.value, option.text])
)

const view = `${TEMPLATES}/features/claims/entry`

const fields = compose(
  oneOf(
    'claimType',
    CLAIM_TYPE_OPTIONS.map((option) => option.value)
  ),
  currency('claimAmount'),
  oneOf(
    'windscreenProvider',
    WINDSCREEN_PROVIDER_OPTIONS.map((option) => option.value)
  )
)

export const claimEntryModel = (values, errors = {}) => ({
  heading: 'Add a claim',
  buttonText: 'Add claim',
  values,
  windscreenOptions: WINDSCREEN_PROVIDER_OPTIONS.map((option) => ({
    ...option,
    checked: option.value === values.windscreenProvider
  })),
  errors,
  errorSummary: kit.errorSummary(errors)
})

export const claimFromPayload = (payload) => ({
  claimType: payload.claimType ?? '',
  claimAmount: (payload.claimAmount ?? '').trim(),
  windscreenProvider: payload.windscreenProvider ?? ''
})

export const validateClaim = (payload) => validate(fields, payload)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Add a claim', { backLink: pagePath('claims') }),
    ...claimEntryModel(values, errors)
  })

const getAdd = (request, h) => {
  state.get(request, h)
  return render(h, { claimType: '', claimAmount: '', windscreenProvider: '' })
}

const postAdd = (request, h) => {
  const payload = request.payload ?? {}
  const entry = claimFromPayload(payload)
  const { value: clean, errors } = validateClaim(payload)
  if (errors) return render(h, entry, errors)

  // MINTS the index (identity)
  state.appendEntry(request, h, 'claims', {
    ...entry,
    claimAmount: clean.claimAmount ?? ''
  })
  return h.redirect(pagePath('claims'))
}

const getRemove = (request, h) => {
  state.removeEntry(request, h, 'claims', Number(request.params.index))
  return h.redirect(pagePath('claims'))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('claims/add'),
    options: open,
    handler: getAdd
  },
  {
    method: 'POST',
    path: pagePath('claims/add'),
    options: open,
    handler: postAdd
  },
  {
    method: 'GET',
    path: pagePath('claims/{index}/remove'),
    options: open,
    handler: getRemove
  }
]
