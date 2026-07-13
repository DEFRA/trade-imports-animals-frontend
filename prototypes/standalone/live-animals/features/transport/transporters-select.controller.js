import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as addressBook from '../../services/address-book/index.js'
import { transportersSelectPage as page } from './page.js'
import { commercialTransporter } from './obligations.js'

export const meta = { ...page, collects: [commercialTransporter.id] }
const view = `${TEMPLATES}/features/transport/transporters-select`

const fields = compose(
  oneOf(
    'commercialTransporter',
    addressBook.parties('commercialTransporter').map((option) => option.id),
    'Select a transporter from the list'
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
    ...kit.base('Search for an approved commercial transporter', {
      backLink: pagePath('transporters')
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    transporterOptions: addressBook
      .parties('commercialTransporter')
      .map((option) => ({
        value: option.id,
        text: option.name,
        hint: {
          text: `${addressSummary(option.address)} — approval number ${option.approvalNumber}`
        },
        checked: option.name === values.selectedName
      }))
  })

const get = async (request, h) => {
  const { answers } = await state.get(request, h)
  return render(h, { selectedName: answers.commercialTransporter?.name })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, {}, errors)

  const chosen = addressBook.party(
    'commercialTransporter',
    payload.commercialTransporter
  )
  const { scope } = await (chosen
    ? state.commit(request, h, {
        commercialTransporter: {
          name: chosen.name,
          address: { ...chosen.address },
          approvalNumber: chosen.approvalNumber
        }
      })
    : state.get(request, h))
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
