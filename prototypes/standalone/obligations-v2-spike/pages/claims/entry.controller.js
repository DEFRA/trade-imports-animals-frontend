import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import * as kit from '../_shared/kit.js'
import { open } from '../_shared/kit.js'

/**
 * Claims entry — the add sub-page (and remove-by-index). This is the whole
 * answer to "the add form has no fulfilment id yet": the add form is a
 * page that, on valid POST, APPENDS and thereby MINTS the identity
 * (claims, arrayIndex). Until that POST the draft lives only in the
 * payload — never a half-created entry in the store. Instances are a pure
 * function of the array length; there is no id ledger and no orphans.
 */
export const CLAIM_TYPE_OPTIONS = [
  { value: 'accident', text: 'Accident' },
  { value: 'theft', text: 'Theft' },
  { value: 'windscreen', text: 'Windscreen' },
  { value: 'other', text: 'Something else' }
]
export const CLAIM_TYPE_LABEL = Object.fromEntries(
  CLAIM_TYPE_OPTIONS.map((o) => [o.value, o.text])
)

const view = `${TEMPLATES}/pages/claims/entry`

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Add a claim', { backLink: pagePath('claims') }),
    heading: 'Add a claim',
    buttonText: 'Add claim',
    options: CLAIM_TYPE_OPTIONS.map((o) => ({
      ...o,
      checked: o.value === values.claimType
    })),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const getAdd = (request, h) => {
  state.get(request, h)
  return render(h, { claimType: '', claimAmount: '' })
}

const postAdd = (request, h) => {
  const payload = request.payload ?? {}
  const entry = {
    claimType: payload.claimType ?? '',
    claimAmount: (payload.claimAmount ?? '').trim()
  }
  state.appendEntry(request, h, 'claims', entry) // MINTS the index (identity)
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
