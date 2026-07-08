import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as addressBook from '../../services/address-book/index.js'
import { consignmentContactSelectPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/contact/template`

// contactAddress is enforcedAt=submit: leaving the radios blank is "not
// answered yet", not a validation error — the save returns to the hub with
// nothing committed. Only an out-of-domain value blocks the save.
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
    address.townOrCity,
    address.county,
    address.postalOrZipCode,
    address.country
  ]
    .filter((part) => part !== '')
    .join(', ')

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Contact address for consignment', { backLink: hubPath() }),
    errors,
    errorSummary: kit.errorSummary(errors),
    contactOptions: addressBook.parties('contact').map((option) => ({
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
  return render(h, { selectedName: answers.contactAddress?.name })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, {}, errors)

  const chosen = addressBook.party('contact', payload.contactAddress)
  // COPY the contact into the answer (spec ruling c-020); a blank save
  // commits nothing and walks on with the current scope.
  const { scope } = chosen
    ? state.commit(request, h, {
        contactAddress: { name: chosen.name, address: { ...chosen.address } }
      })
    : state.get(request, h)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
