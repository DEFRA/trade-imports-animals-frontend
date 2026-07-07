import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'

/**
 * Vendored EXEMPLAR stand-in for the place-of-destination reference list
 * (spec ruling c-018: MDM reference data wins and this constant is the swap
 * point). Each entry carries the full V4 Standard Address Block so a
 * selection can be saved by copy (spec ruling c-020) — the chosen party's
 * name and address are copied into the `placeOfDestination` answer, never
 * shared by reference.
 */
export const DESTINATION_OPTIONS = [
  {
    id: 'tech-imports-ltd',
    name: 'Tech Imports Ltd',
    address: {
      addressLine1: '643 Main Street',
      addressLine2: '',
      townOrCity: 'Birmingham',
      county: 'West Midlands',
      postalOrZipCode: 'B1 3AZ',
      country: 'United Kingdom',
      telephoneNumber: '+44 121 555 0143',
      emailAddress: 'goods-in@tech-imports.example.co.uk'
    }
  },
  {
    id: 'united-commerce',
    name: 'United Commerce',
    address: {
      addressLine1: '446 Church Lane',
      addressLine2: '',
      townOrCity: 'Manchester',
      county: 'Greater Manchester',
      postalOrZipCode: 'M1 2JE',
      country: 'United Kingdom',
      telephoneNumber: '+44 161 555 0446',
      emailAddress: 'deliveries@united-commerce.example.co.uk'
    }
  },
  {
    id: 'global-trading-co',
    name: 'Global Trading Co',
    address: {
      addressLine1: '945 Main Street',
      addressLine2: 'Unit 4',
      townOrCity: 'London',
      county: '',
      postalOrZipCode: 'E1 5AB',
      country: 'United Kingdom',
      telephoneNumber: '+44 20 7946 0945',
      emailAddress: 'warehouse@global-trading.example.co.uk'
    }
  }
]

const view = `${TEMPLATES}/features/addresses/destinations-select`

// placeOfDestination is enforcedAt=submit: leaving the radios blank is "not
// answered yet", not a validation error — the save returns to the landing
// page with nothing committed. Only an out-of-domain value blocks the save.
const fields = compose(
  oneOf(
    'placeOfDestination',
    DESTINATION_OPTIONS.map((option) => option.id),
    'Select a place of destination from the list'
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
    ...kit.base('Search for a place of destination', {
      backLink: pagePath('addresses')
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    destinationOptions: DESTINATION_OPTIONS.map((option) => ({
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
  return render(h, { selectedName: answers.placeOfDestination?.name })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, {}, errors)

  const chosen = DESTINATION_OPTIONS.find(
    (option) => option.id === payload.placeOfDestination
  )
  if (chosen) {
    // COPY the party into the answer (spec ruling c-020).
    state.commit(request, h, {
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
