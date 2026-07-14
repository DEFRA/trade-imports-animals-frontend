import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import * as addressBook from '../../services/address-book/index.js'
import { CREATE_ADDRESS_SLUG } from './create-address.controller.js'

const view = `${TEMPLATES}/features/addresses/consignors-select`

const fields = () =>
  compose(
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
    address.addressLine3,
    address.townOrCity,
    address.postalOrZipCode,
    address.country
  ]
    .filter((part) => part)
    .join(', ')

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Consignor or exporter', {
      backLink: pagePath('addresses'),
      journey
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    createAddressHref: pagePath(`${CREATE_ADDRESS_SLUG}?for=consignor`),
    consignorOptions: addressBook.parties('consignor').map((option) => ({
      value: option.id,
      text: option.name,
      hint: { text: addressSummary(option.address) },
      checked: option.name === values.selectedName
    }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { selectedName: answers.consignor?.name })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields(), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, {}, errors)
  }

  const chosen = addressBook.party('consignor', payload.consignor)
  if (chosen) {
    await state.commit(request, h, {
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
