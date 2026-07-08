import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as addressBook from '../../services/address-book/index.js'
import { transportersSelectPage as page } from './page.js'
import { commercialTransporter } from './obligations.js'

/**
 * The commercial spoke of the transporter-type split: a copy-commit select
 * like the addresses spokes, but a full SECTION PAGE (in the transport
 * section's pages array) — its derived gate keeps it reachable only while
 * the transporter type is 'Commercial transporter', the same in-section
 * conditional shape as import-purpose.
 */
export const meta = { ...page, collects: [commercialTransporter.id] }
const view = `${TEMPLATES}/features/transport/transporters-select`

// commercialTransporter is enforcedAt=submit: leaving the radios blank is
// "not answered yet", not a validation error — the save walks on with
// nothing committed. Only an out-of-domain value blocks the save.
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
    address.townOrCity,
    address.county,
    address.postalOrZipCode,
    address.country
  ]
    .filter((part) => part !== '')
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

const get = (request, h) => {
  const { answers } = state.get(request, h)
  // The answer is a copy, not a reference — re-derive the checked option by
  // matching the copied name back against the vendored list.
  return render(h, { selectedName: answers.commercialTransporter?.name })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, {}, errors)

  const chosen = addressBook.party(
    'commercialTransporter',
    payload.commercialTransporter
  )
  // COPY the transporter into the answer (spec ruling c-020); a blank save
  // commits nothing and walks on with the current scope.
  const { scope } = chosen
    ? state.commit(request, h, {
        commercialTransporter: {
          name: chosen.name,
          address: { ...chosen.address },
          approvalNumber: chosen.approvalNumber
        }
      })
    : state.get(request, h)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
