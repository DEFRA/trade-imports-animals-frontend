import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'

/**
 * Vendored EXEMPLAR stand-in for the consignor reference list (spec ruling
 * c-018: MDM reference data wins and this constant is the swap point). Each
 * entry carries the full V4 Standard Address Block so a selection can be
 * saved by copy (spec ruling c-020) — the chosen party's name and address
 * are copied into the `consignor` answer, never shared by reference.
 */
export const CONSIGNOR_OPTIONS = [
  {
    id: 'laiterie-du-nord',
    name: 'Laiterie du Nord SARL',
    address: {
      addressLine1: '12 Rue de la Gare',
      addressLine2: '',
      townOrCity: 'Lille',
      county: '',
      postalOrZipCode: '59000',
      country: 'France',
      telephoneNumber: '+33 3 20 61 10 10',
      emailAddress: 'exports@laiterie-du-nord.example.com'
    }
  },
  {
    id: 'eurostore-services',
    name: 'EuroStore Services',
    address: {
      addressLine1: 'Rue de la Loi 200',
      addressLine2: '',
      townOrCity: 'Brussels',
      county: '',
      postalOrZipCode: '1040',
      country: 'Belgium',
      telephoneNumber: '+32 2 555 12 34',
      emailAddress: 'dispatch@eurostore.example.be'
    }
  },
  {
    id: 'alpenhof-viehhandel',
    name: 'Alpenhof Viehhandel GmbH',
    address: {
      addressLine1: 'Bahnhofstrasse 5',
      addressLine2: 'Haus B',
      townOrCity: 'Bern',
      county: '',
      postalOrZipCode: '3011',
      country: 'Switzerland',
      telephoneNumber: '+41 31 555 00 11',
      emailAddress: 'office@alpenhof.example.ch'
    }
  }
]

const view = `${TEMPLATES}/features/addresses/consignors-select`

// consignor is enforcedAt=submit: leaving the radios blank is "not answered
// yet", not a validation error — the save returns to the landing page with
// nothing committed. Only an out-of-domain value blocks the save.
const fields = compose(
  oneOf(
    'consignor',
    CONSIGNOR_OPTIONS.map((option) => option.id),
    'Select a consignor from the list'
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
    ...kit.base('Search for an existing consignor or exporter', {
      backLink: pagePath('addresses')
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    consignorOptions: CONSIGNOR_OPTIONS.map((option) => ({
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
  return render(h, { selectedName: answers.consignor?.name })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, {}, errors)

  const chosen = CONSIGNOR_OPTIONS.find(
    (option) => option.id === payload.consignor
  )
  if (chosen) {
    // COPY the party into the answer (spec ruling c-020).
    state.commit(request, h, {
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
