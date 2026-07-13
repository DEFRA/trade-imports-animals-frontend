import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import * as addressBook from '../../services/address-book/index.js'

const view = `${TEMPLATES}/features/addresses/destinations-select`

const fields = compose(
  oneOf(
    'placeOfDestination',
    addressBook.parties('destination').map((option) => option.id),
    'Select a place of destination from the list'
  )
)

const addressSummary = (address) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.addressLine3,
    address.country
  ]
    .filter((part) => part)
    .join(', ')

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Search for a place of destination', {
      backLink: pagePath('addresses')
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    destinationOptions: addressBook.parties('destination').map((option) => ({
      value: option.id,
      text: option.name,
      hint: { text: addressSummary(option.address) },
      checked: option.name === values.selectedName
    }))
  })

const get = async (request, h) => {
  const { answers } = await state.get(request, h)
  return render(h, { selectedName: answers.placeOfDestination?.name })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, {}, errors)

  const chosen = addressBook.party('destination', payload.placeOfDestination)
  if (chosen) {
    await state.commit(request, h, {
      placeOfDestination: { name: chosen.name, address: { ...chosen.address } }
    })
  }
  return h.redirect(pagePath('addresses'))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('destinations/select'),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath('destinations/select'),
    options: open,
    handler: post
  }
]
