import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'

/**
 * Vendored EXEMPLAR stand-in for the importer reference list (spec ruling
 * c-018: MDM reference data wins and this constant is the swap point). Each
 * entry carries the full V4 Standard Address Block so a selection can be
 * saved by copy (spec ruling c-020) — the chosen party's name and address
 * are copied into the `importer` answer, never shared by reference.
 */
export const IMPORTER_OPTIONS = [
  {
    id: 'albion-livestock-imports',
    name: 'Albion Livestock Imports Ltd',
    address: {
      addressLine1: '18 Harbour Road',
      addressLine2: '',
      townOrCity: 'Dover',
      county: 'Kent',
      postalOrZipCode: 'CT17 9BU',
      country: 'United Kingdom',
      telephoneNumber: '+44 1304 555 0184',
      emailAddress: 'notifications@albion-livestock.example.co.uk'
    }
  },
  {
    id: 'severn-vale-imports',
    name: 'Severn Vale Imports',
    address: {
      addressLine1: 'The Old Granary',
      addressLine2: 'Quedgeley Trading Estate',
      townOrCity: 'Gloucester',
      county: 'Gloucestershire',
      postalOrZipCode: 'GL2 4PA',
      country: 'United Kingdom',
      telephoneNumber: '+44 1452 555 0127',
      emailAddress: 'imports@severn-vale.example.co.uk'
    }
  },
  {
    id: 'harwich-port-agencies',
    name: 'Harwich Port Agencies',
    address: {
      addressLine1: '2 Quayside House',
      addressLine2: '',
      townOrCity: 'Harwich',
      county: 'Essex',
      postalOrZipCode: 'CO12 3HH',
      country: 'United Kingdom',
      telephoneNumber: '+44 1255 555 0163',
      emailAddress: 'agency@harwich-port.example.co.uk'
    }
  }
]

const view = `${TEMPLATES}/features/addresses/importers-select`

// importer is enforcedAt=submit: leaving the radios blank is "not answered
// yet", not a validation error — the save returns to the landing page with
// nothing committed. Only an out-of-domain value blocks the save.
const fields = compose(
  oneOf(
    'importer',
    IMPORTER_OPTIONS.map((option) => option.id),
    'Select an importer from the list'
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
    ...kit.base('Search for an importer', {
      backLink: pagePath('addresses')
    }),
    errors,
    errorSummary: kit.errorSummary(errors),
    importerOptions: IMPORTER_OPTIONS.map((option) => ({
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
  return render(h, { selectedName: answers.importer?.name })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, {}, errors)

  const chosen = IMPORTER_OPTIONS.find(
    (option) => option.id === payload.importer
  )
  if (chosen) {
    // COPY the party into the answer (spec ruling c-020).
    state.commit(request, h, {
      importer: { name: chosen.name, address: { ...chosen.address } }
    })
  }
  return h.redirect(pagePath('addresses'))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('importers/select'),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath('importers/select'),
    options: open,
    handler: post
  }
]
