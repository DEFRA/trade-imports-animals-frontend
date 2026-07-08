import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import * as addressBook from '../../services/address-book/index.js'

const view = `${TEMPLATES}/features/addresses/consignors-select`

// consignor is enforcedAt=submit: leaving the radios blank is "not answered
// yet", not a validation error — the save returns to the landing page with
// nothing committed. Only an out-of-domain value blocks the save.
const fields = compose(
  oneOf(
    'consignor',
    addressBook.parties('consignor').map((option) => option.id),
    'Select a consignor from the list'
  )
)

const addressSummary = (address) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.townOrCity,
    address.county,
    address.postalOrZipCode,
    address.country
  ]
    .filter((part) => part !== '')
    .join(', ')

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Search for an existing consignor or exporter', {
      backLink: pagePath('addresses')
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    consignorOptions: addressBook.parties('consignor').map((option) => ({
      value: option.id,
      text: option.name,
      hint: { text: addressSummary(option.address) },
      checked: option.name === values.selectedName
    }))
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  // The answer is a copy, not a reference — re-derive the checked option by
  // matching the copied name back against the vendored list.
  return render(h, { selectedName: answers.consignor?.name })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, {}, errors)

  const chosen = addressBook.party('consignor', payload.consignor)
  if (chosen) {
    // COPY the party into the answer (spec ruling c-020).
    state.commit(request, h, {
      consignor: { name: chosen.name, address: { ...chosen.address } }
    })
  }
  return h.redirect(pagePath('addresses'))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('consignors/select'),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath('consignors/select'),
    options: open,
    handler: post
  }
]
