import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, requiredOneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as countries from '../../services/countries/index.js'
import { destinationCountryPage as page } from './page.js'
import { copy as en } from './copy.en.js'

export const meta = { ...page, collects: ['destinationCountry'] }
const view = `${TEMPLATES}/features/destination-country/template`

const copy = copyFor({ en })

const countryItems = () => [
  { value: '', text: copy.country.placeholder },
  { value: '', text: '──────────', disabled: true },
  ...countries.originCountries()
]

const fields = () =>
  compose(
    requiredOneOf(
      'destinationCountry',
      countries.originCountries().map(({ value }) => value),
      copy.errors.countryRequired
    )
  )

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, { backLink: hubPath(), journey }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems()
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, {
    destinationCountry: answers.destinationCountry ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { destinationCountry: payload.destinationCountry ?? '' }
  const { errors } = validate(fields(), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors)
  }

  const { scope } = await state.commit(request, h, values)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
