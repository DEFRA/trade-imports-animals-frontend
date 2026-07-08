import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import * as addressBook from '../../services/address-book/index.js'

const view = `${TEMPLATES}/features/addresses/importers-select`

const fields = compose(
  oneOf(
    'importer',
    addressBook.parties('importer').map((option) => option.id),
    'Select an importer from the list'
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
    ...kit.base('Search for an importer', {
      backLink: pagePath('addresses')
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    importerOptions: addressBook.parties('importer').map((option) => ({
      value: option.id,
      text: option.name,
      hint: { text: addressSummary(option.address) },
      checked: option.name === values.selectedName
    }))
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, { selectedName: answers.importer?.name })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, {}, errors)

  const chosen = addressBook.party('importer', payload.importer)
  if (chosen) {
    state.commit(request, h, {
      importer: { name: chosen.name, address: { ...chosen.address } }
    })
  }
  return h.redirect(pagePath('addresses'))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('importers/select'),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath('importers/select'),
    options: open,
    handler: post
  }
]
