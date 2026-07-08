import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  compose,
  oneOf,
  requiredOneOf,
  validate
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'

/**
 * Vendored stand-ins for the MDM reference lists (spec ruling c-018: MDM
 * wins and these option lists are the swap points). Commodity values are
 * the V4 list entries verbatim — code plus name — because the V4
 * conditional-field lists (number of packages, and the M2 identifier
 * fields) key on those exact strings, and code alone is ambiguous
 * (01061900 covers Cats, Dogs, Ferrets and Rodents).
 */
export const COMMODITY_OPTIONS = [
  '0102 - Cattle',
  '0101 - Horse',
  '01061900 - Cats',
  '01061900 - Dogs',
  '0301 - Fish'
]

export const TYPE_OPTIONS = [
  { value: 'domestic', text: 'Domestic' },
  { value: 'game', text: 'Game' }
]
export const TYPE_LABEL = Object.fromEntries(
  TYPE_OPTIONS.map((option) => [option.value, option.text])
)

export const SPECIES_OPTIONS = [
  { value: 'bison-bison', text: 'Bison bison (Bison)' },
  { value: 'bos-spp', text: 'Bos spp. (Cattle species)' },
  { value: 'bos-taurus', text: 'Bos taurus (Cattle)' },
  { value: 'bubalus-bubalis', text: 'Bubalus bubalis (Water buffalo)' }
]
export const SPECIES_LABEL = Object.fromEntries(
  SPECIES_OPTIONS.map((option) => [option.value, option.text])
)

const view = `${TEMPLATES}/features/commodities/select`

// commoditySelection is enforcedAt=continue (spec ruling c-023): blank
// blocks Save and Continue. typeSelection and speciesSelection are
// enforcedAt=submit — blank passes validation and each stays an open
// requirement for the line's completeness roll-up.
const fields = compose(
  requiredOneOf('commoditySelection', COMMODITY_OPTIONS, 'Select a commodity'),
  oneOf(
    'typeSelection',
    TYPE_OPTIONS.map((option) => option.value)
  )
)

const knownSpecies = new Set(SPECIES_OPTIONS.map((option) => option.value))
const speciesFromPayload = (payload) =>
  [].concat(payload.speciesSelection ?? []).filter((v) => knownSpecies.has(v))

const commodityItems = (selected) => [
  { value: '', text: 'Select a commodity' },
  ...COMMODITY_OPTIONS.map((value) => ({
    value,
    text: value,
    selected: value === selected
  }))
]

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Select species of commodity', {
      backLink: pagePath('commodities')
    }),
    heading: 'Select species of commodity',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    commodityItems: commodityItems(values.commoditySelection),
    typeOptions: TYPE_OPTIONS.map((option) => ({
      ...option,
      checked: option.value === values.typeSelection
    })),
    speciesOptions: SPECIES_OPTIONS.map((option) => ({
      ...option,
      checked: values.speciesSelection.includes(option.value)
    }))
  })

const getAdd = (request, h) => {
  state.get(request, h)
  return render(h, {
    commoditySelection: '',
    typeSelection: '',
    speciesSelection: []
  })
}

const postAdd = (request, h) => {
  const payload = request.payload ?? {}
  const entry = {
    commoditySelection: payload.commoditySelection ?? '',
    typeSelection: payload.typeSelection ?? '',
    speciesSelection: speciesFromPayload(payload)
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, entry, errors)

  // MINTS the index (identity), then hands over to the details sub-page —
  // the multi-page entry pattern (see features/documents/ for the same shape).
  const index = state.appendEntry(request, h, 'commodityLines', {
    ...entry,
    numberOfPackages: '',
    numberOfAnimalsQuantity: ''
  })
  return h.redirect(pagePath(`commodities/${index}/details`))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('commodities/select'),
    options: open,
    handler: getAdd
  },
  {
    method: 'POST',
    path: pagePath('commodities/select'),
    options: open,
    handler: postAdd
  }
]
