import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'

/**
 * Vendored EXEMPLAR stand-in for the consignee reference list (spec ruling
 * c-018: MDM reference data wins and this constant is the swap point). Each
 * entry carries the full V4 Standard Address Block so a selection can be
 * saved by copy (spec ruling c-020) — the chosen party's name and address
 * are copied into the `consignee` answer, never shared by reference.
 */
export const CONSIGNEE_OPTIONS = [
  {
    id: 'yorkshire-dales-livestock',
    name: 'Yorkshire Dales Livestock Ltd',
    address: {
      addressLine1: 'Unit 4, Auction Mart Lane',
      addressLine2: '',
      townOrCity: 'Skipton',
      county: 'North Yorkshire',
      postalOrZipCode: 'BD23 1UD',
      country: 'United Kingdom',
      telephoneNumber: '+44 1756 555 0192',
      emailAddress: 'intake@yorkshire-dales-livestock.example.co.uk'
    }
  },
  {
    id: 'greenacre-farming',
    name: 'Greenacre Farming Co',
    address: {
      addressLine1: 'Greenacre Farm',
      addressLine2: 'Lower Henlade',
      townOrCity: 'Taunton',
      county: 'Somerset',
      postalOrZipCode: 'TA3 5NB',
      country: 'United Kingdom',
      telephoneNumber: '+44 1823 555 0170',
      emailAddress: 'office@greenacre-farming.example.co.uk'
    }
  },
  {
    id: 'border-mart-holdings',
    name: 'Border Mart Holdings',
    address: {
      addressLine1: 'Rosehill Estate',
      addressLine2: '',
      townOrCity: 'Carlisle',
      county: 'Cumbria',
      postalOrZipCode: 'CA1 2RW',
      country: 'United Kingdom',
      telephoneNumber: '+44 1228 555 0139',
      emailAddress: 'arrivals@border-mart.example.co.uk'
    }
  }
]

const view = `${TEMPLATES}/features/addresses/consignees-select`

// consignee is enforcedAt=submit: leaving the radios blank is "not answered
// yet", not a validation error — the save returns to the landing page with
// nothing committed. Only an out-of-domain value blocks the save.
const fields = compose(
  oneOf(
    'consignee',
    CONSIGNEE_OPTIONS.map((option) => option.id),
    'Select a consignee from the list'
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
    ...kit.base('Search for a consignee', {
      backLink: pagePath('addresses')
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    consigneeOptions: CONSIGNEE_OPTIONS.map((option) => ({
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
  return render(h, { selectedName: answers.consignee?.name })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, {}, errors)

  const chosen = CONSIGNEE_OPTIONS.find(
    (option) => option.id === payload.consignee
  )
  if (chosen) {
    // COPY the party into the answer (spec ruling c-020).
    state.commit(request, h, {
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
