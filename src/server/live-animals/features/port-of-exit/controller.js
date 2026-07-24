import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, requiredOneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as ports from '../../services/ports/index.js'
import { portOfExitPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['portOfExit'] }
const view = `${TEMPLATES}/features/port-of-exit/template`

const copy = copyFor({ en, cy })

const portItems = (selected) => [
  { value: '', text: copy.port.placeholder },
  { value: '', text: '──────────', disabled: true },
  ...ports.list().map((port) => ({
    value: port.code,
    text: `${port.name} (${port.code})`,
    selected: port.code === selected
  }))
]

const fields = () =>
  compose(
    requiredOneOf(
      'portOfExit',
      ports.list().map((port) => port.code),
      copy.errors.portRequired
    )
  )

const render = (h, journey, values, errors = {}, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    portItems: portItems(values.portOfExit)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { portOfExit: answers.portOfExit ?? '' })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { portOfExit: payload.portOfExit ?? '' }
  const { errors } = validate(fields(), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors)
  }

  let committed
  const failure = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, values)
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(h, journey, values, {}, true).code(500)
    }
  )
  if (failure) return failure

  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
