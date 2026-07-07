import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'

/**
 * Vendored EXEMPLAR stand-in for the place-of-origin reference list (spec
 * ruling c-018: MDM reference data wins and this constant is the swap
 * point). Each entry carries the full V4 Standard Address Block so a
 * selection can be saved by copy (spec ruling c-020) — the chosen party's
 * name and address are copied into the `placeOfOrigin` answer, never
 * shared by reference.
 */
export const PLACE_OF_ORIGIN_OPTIONS = [
  {
    id: 'ferme-des-trois-vallees',
    name: 'Ferme des Trois Vallées',
    address: {
      addressLine1: '3 Chemin des Prés',
      addressLine2: '',
      townOrCity: 'Annecy',
      county: '',
      postalOrZipCode: '74000',
      country: 'France',
      telephoneNumber: '+33 4 50 55 01 23',
      emailAddress: 'contact@trois-vallees.example.fr'
    }
  },
  {
    id: 'van-dijk-livestock',
    name: 'Van Dijk Livestock BV',
    address: {
      addressLine1: 'Polderweg 18',
      addressLine2: '',
      townOrCity: 'Utrecht',
      county: '',
      postalOrZipCode: '3541 AB',
      country: 'Netherlands',
      telephoneNumber: '+31 30 555 0187',
      emailAddress: 'export@vandijk-livestock.example.nl'
    }
  },
  {
    id: 'lindenhof-agrar',
    name: 'Lindenhof Agrar GmbH',
    address: {
      addressLine1: 'Dorfstrasse 44',
      addressLine2: 'Hof 2',
      townOrCity: 'Münster',
      county: '',
      postalOrZipCode: '48143',
      country: 'Germany',
      telephoneNumber: '+49 251 555 0144',
      emailAddress: 'versand@lindenhof-agrar.example.de'
    }
  }
]

const view = `${TEMPLATES}/features/addresses/place-of-origin-select`

// placeOfOrigin is enforcedAt=submit: leaving the radios blank is "not
// answered yet", not a validation error — the save returns to the landing
// page with nothing committed. Only an out-of-domain value blocks the save.
const fields = compose(
  oneOf(
    'placeOfOrigin',
    PLACE_OF_ORIGIN_OPTIONS.map((option) => option.id),
    'Select a place of origin from the list'
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
    ...kit.base('Search for a place of origin', {
      backLink: pagePath('addresses')
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    placeOfOriginOptions: PLACE_OF_ORIGIN_OPTIONS.map((option) => ({
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
  return render(h, { selectedName: answers.placeOfOrigin?.name })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, {}, errors)

  const chosen = PLACE_OF_ORIGIN_OPTIONS.find(
    (option) => option.id === payload.placeOfOrigin
  )
  if (chosen) {
    // COPY the party into the answer (spec ruling c-020).
    state.commit(request, h, {
      placeOfOrigin: { name: chosen.name, address: { ...chosen.address } }
    })
  }
  return h.redirect(pagePath('addresses'))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('place-of-origin/select'),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath('place-of-origin/select'),
    options: open,
    handler: post
  }
]
