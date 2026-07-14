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
import * as commodities from '../../services/commodities/index.js'

const view = `${TEMPLATES}/features/commodities/select`

const fields = compose(
  requiredOneOf('commoditySelection', commodities.list(), 'Select a commodity'),
  oneOf(
    'typeSelection',
    commodities.types().map((option) => option.value)
  )
)

const knownSpecies = new Set(
  commodities.species().map((option) => option.value)
)
const speciesFromPayload = (payload) =>
  [].concat(payload.speciesSelection ?? []).filter((v) => knownSpecies.has(v))

const commodityItems = (selected) => [
  { value: '', text: 'Select a commodity' },
  ...commodities.list().map((value) => ({
    value,
    text: value,
    selected: value === selected
  }))
]

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Select species of commodity', {
      backLink: pagePath('commodities'),
      journey
    }),
    heading: 'Select species of commodity',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    commodityItems: commodityItems(values.commoditySelection),
    typeOptions: commodities.types().map((option) => ({
      ...option,
      checked: option.value === values.typeSelection
    })),
    speciesOptions: commodities.species().map((option) => ({
      ...option,
      checked: values.speciesSelection.includes(option.value)
    }))
  })

const getAdd = async (request, h) => {
  const { journey } = await state.get(request, h)
  return render(h, journey, {
    commoditySelection: '',
    typeSelection: '',
    speciesSelection: []
  })
}

const postAdd = async (request, h) => {
  const payload = request.payload ?? {}
  const entry = {
    commoditySelection: payload.commoditySelection ?? '',
    typeSelection: payload.typeSelection ?? '',
    speciesSelection: speciesFromPayload(payload)
  }
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, entry, errors)
  }

  const index = await state.appendEntry(request, h, 'commodityLines', {
    ...entry,
    numberOfPackages: '',
    numberOfAnimalsQuantity: ''
  })
  return h.redirect(
    kit.hubExitTarget(request) ?? pagePath(`commodities/${index}/details`)
  )
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
