import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
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

/**
 * Vendored EXEMPLAR stand-in for the approved commercial transporter list —
 * V4 leaves the source list TBC (unresolved inline comment on that clause),
 * so per spec ruling c-018 reference data wins and this constant is the
 * swap point. Each entry carries the full V4 Standard Address Block plus
 * the transporter's approval number; a selection is saved BY COPY (spec
 * ruling c-020) — name, address and approval number are copied into the
 * `commercialTransporter` answer, never shared by reference.
 */
export const COMMERCIAL_TRANSPORTER_OPTIONS = [
  {
    id: 'channel-livestock-logistics',
    name: 'Channel Livestock Logistics Ltd',
    approvalNumber: 'UK/DOVER/T2/00012345',
    address: {
      addressLine1: '18 Eastern Docks',
      addressLine2: '',
      townOrCity: 'Dover',
      county: 'Kent',
      postalOrZipCode: 'CT16 1JA',
      country: 'United Kingdom',
      telephoneNumber: '+44 1304 555 0171',
      emailAddress: 'bookings@channel-livestock.example.co.uk'
    }
  },
  {
    id: 'transeuropa-animaux',
    name: 'TransEuropa Animaux SARL',
    approvalNumber: 'FR/CALAI/T2/00067890',
    address: {
      addressLine1: '4 Quai de la Marine',
      addressLine2: '',
      townOrCity: 'Calais',
      county: '',
      postalOrZipCode: '62100',
      country: 'France',
      telephoneNumber: '+33 3 21 55 01 62',
      emailAddress: 'dispatch@transeuropa-animaux.example.fr'
    }
  },
  {
    id: 'lagan-valley-haulage',
    name: 'Lagan Valley Haulage Ltd',
    approvalNumber: 'UK/NEWCA/T1/00090953',
    address: {
      addressLine1: 'Unit 7, Harbour Estate',
      addressLine2: '',
      townOrCity: 'Belfast',
      county: 'County Antrim',
      postalOrZipCode: 'BT3 9DT',
      country: 'United Kingdom',
      telephoneNumber: '+44 28 9055 0148',
      emailAddress: 'office@lagan-valley-haulage.example.co.uk'
    }
  }
]

// commercialTransporter is enforcedAt=submit: leaving the radios blank is
// "not answered yet", not a validation error — the save walks on with
// nothing committed. Only an out-of-domain value blocks the save.
const fields = compose(
  oneOf(
    'commercialTransporter',
    COMMERCIAL_TRANSPORTER_OPTIONS.map((option) => option.id),
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
    transporterOptions: COMMERCIAL_TRANSPORTER_OPTIONS.map((option) => ({
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

  const chosen = COMMERCIAL_TRANSPORTER_OPTIONS.find(
    (option) => option.id === payload.commercialTransporter
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
