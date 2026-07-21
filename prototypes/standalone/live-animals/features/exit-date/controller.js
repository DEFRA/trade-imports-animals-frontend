import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, dateParts, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { exitDatePage as page } from './page.js'

export const meta = { ...page, collects: ['exitDate'] }
const view = `${TEMPLATES}/features/exit-date/template`

const fields = () => compose(dateParts('exitDate', 'Enter a real exit date'))

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Exit date', { backLink: hubPath(), journey }),
    heading: 'Exit date',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    exitDate: kit.dateField('exitDate', {
      label: 'Exit date',
      hint: 'The date the animals are expected to leave Great Britain. For example, 27/3/2026',
      value: values.exitDate ?? {},
      error: errors['exitDate-day']
    })
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { exitDate: answers.exitDate ?? {} })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { exitDate: kit.readDate(payload, 'exitDate') }
  const { errors } = validate(fields(), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors)
  }

  const { scope } = await state.commit(request, h, values)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
