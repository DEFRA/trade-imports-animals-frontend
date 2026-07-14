import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as addressBook from '../../services/address-book/index.js'
import { consignmentContactSelectPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/contact/template`

const fields = compose(
  oneOf(
    'contactAddress',
    addressBook.parties('contact').map((option) => option.id),
    'Select a contact address'
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

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Contact address for consignment', {
      backLink: hubPath(),
      journey
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    contactOptions: addressBook.parties('contact').map((option) => ({
      value: option.id,
      text: option.name,
      hint: { text: addressSummary(option.address) },
      checked: option.name === values.selectedName
    }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { selectedName: answers.contactAddress?.name })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, {}, errors)
  }

  const chosen = addressBook.party('contact', payload.contactAddress)
  const { scope } = await (chosen
    ? state.commit(request, h, {
        contactAddress: { name: chosen.name, address: { ...chosen.address } }
      })
    : state.get(request, h))
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
