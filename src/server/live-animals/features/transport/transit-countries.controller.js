import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as countries from '../../services/countries/index.js'
import { transitCountriesPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['transitedCountries'] }
const view = `${TEMPLATES}/features/transport/transit-countries`

export const MAX_TRANSITED_COUNTRIES = 12

const copy = copyFor({ en, cy }).transitCountries

const HTTP_STATUS_BAD_REQUEST = 400

const countryItems = (selected) => [
  { value: '', text: copy.placeholder },
  ...countries.originCountries().map(({ value, text }) => ({
    value,
    text,
    selected: value === selected
  }))
]

const selectRows = (selected) => {
  const rows = selected.map((code) => countryItems(code))
  return rows.length < MAX_TRANSITED_COUNTRIES
    ? [...rows, countryItems('')]
    : rows
}

const transitedCountriesErrors = (selected, adding) => {
  if (selected.some((code) => countries.originLabel(code) === undefined)) {
    return { transitedCountries: copy.errors.fromList }
  }
  if (selected.length > MAX_TRANSITED_COUNTRIES) {
    return {
      transitedCountries: copy.errors.maxCountries(MAX_TRANSITED_COUNTRIES)
    }
  }
  if (!adding && selected.length === 0) {
    return { transitedCountries: copy.errors.selectAtLeastOne }
  }
  return {}
}

const render = (h, journey, selected, errors = {}, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      recoverableError
    }),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryRows: selectRows(selected),
    canAddAnother: selected.length + 1 < MAX_TRANSITED_COUNTRIES
  })

const selectedFrom = (payload) => [
  ...new Set(
    [].concat(payload.transitedCountries ?? []).filter((code) => code !== '')
  )
]

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, [].concat(answers.transitedCountries ?? []))
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const selected = selectedFrom(payload)
  const errors = transitedCountriesErrors(
    selected,
    payload.addCountry !== undefined
  )
  if (Object.keys(errors).length > 0) {
    const { journey } = await state.get(request, h)
    return render(h, journey, selected, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  let committed
  const failure = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, {
        transitedCountries: selected
      })
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(h, journey, selected, {}, true).code(500)
    }
  )
  if (failure) return failure

  const { scope } = committed
  if (payload.addCountry !== undefined) {
    return h.redirect(
      kit.withChangeContext(
        request,
        pagePath(request.params.journeyId, page.slug)
      )
    )
  }
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
