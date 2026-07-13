import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import * as addressBook from '../../services/address-book/index.js'
import { CREATE_ADDRESS_SLUG } from './create-address.controller.js'

const view = `${TEMPLATES}/features/addresses/consignees-select`

const fields = () =>
  compose(
    oneOf(
      'consignee',
      addressBook.parties('consignee').map((option) => option.id),
      'Select a consignee from the list'
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

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Search for a consignee', {
      backLink: pagePath('addresses')
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    createAddressHref: pagePath(`${CREATE_ADDRESS_SLUG}?for=consignee`),
    consigneeOptions: addressBook.parties('consignee').map((option) => ({
      value: option.id,
      text: option.name,
      hint: { text: addressSummary(option.address) },
      checked: option.name === values.selectedName
    }))
  })

const get = async (request, h) => {
  const { answers } = await state.get(request, h)
  return render(h, { selectedName: answers.consignee?.name })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields(), payload)
  if (errors) return render(h, {}, errors)

  const chosen = addressBook.party('consignee', payload.consignee)
  if (chosen) {
    await state.commit(request, h, {
      consignee: { name: chosen.name, address: { ...chosen.address } }
    })
  }
  return h.redirect(pagePath('addresses'))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('consignees/select'),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath('consignees/select'),
    options: open,
    handler: post
  }
]
