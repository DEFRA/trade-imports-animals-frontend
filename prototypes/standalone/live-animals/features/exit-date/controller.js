import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, dateParts, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { exitDatePage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['exitDate'] }
const view = `${TEMPLATES}/features/exit-date/template`

const copy = copyFor({ en, cy })

const fields = () => compose(dateParts('exitDate', copy.errors.dateInvalid))

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, { backLink: hubPath(), journey }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    exitDate: kit.dateField('exitDate', {
      label: copy.date.label,
      hint: copy.date.hint,
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
