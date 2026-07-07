import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { consignmentContactSelectPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/contact/template`

/**
 * Vendored EXEMPLAR stand-in for the gov.identity contact list, seeded from
 * the skeleton's mock-contacts.json (spec ruling c-018: reference data wins
 * and this constant is the swap point). V4's two contact-address variants
 * share one anchor (c-001, unresolved): this page builds only the
 * select-from-gov.identity side; the user-created Standard-address-block
 * variant is NOT built until c-001 is ruled on. Each entry carries the full
 * V4 Standard Address Block so a selection can be saved BY COPY (spec
 * ruling c-020) — the chosen contact's name and address are copied into
 * the `contactAddress` answer, never shared by reference.
 */
export const CONTACT_OPTIONS = [
  {
    id: 'animal-and-plant-health-agency',
    name: 'Animal and Plant Health Agency',
    address: {
      addressLine1: 'Woodham Lane',
      addressLine2: 'New Haw',
      townOrCity: 'Addlestone',
      county: 'Surrey',
      postalOrZipCode: 'KT15 3NB',
      country: 'United Kingdom',
      telephoneNumber: '+44 3000 200 301',
      emailAddress: 'enquiries@apha.example.gov.uk'
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
  }
]

// contactAddress is enforcedAt=submit: leaving the radios blank is "not
// answered yet", not a validation error — the save returns to the hub with
// nothing committed. Only an out-of-domain value blocks the save.
const fields = compose(
  oneOf(
    'contactAddress',
    CONTACT_OPTIONS.map((option) => option.id),
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
    contactOptions: CONTACT_OPTIONS.map((option) => ({
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

  const chosen = CONTACT_OPTIONS.find(
    (option) => option.id === payload.contactAddress
  )
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
