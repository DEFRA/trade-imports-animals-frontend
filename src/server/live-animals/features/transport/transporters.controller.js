import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as transportReference from '../../services/transport-reference/index.js'
import { transportersPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['transporterType'] }
const view = `${TEMPLATES}/features/transport/transporters`

const copy = copyFor({ en, cy }).transporters

const fields = compose(
  oneOf('transporterType', transportReference.transporterTypes())
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
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { transporterType: answers.transporterType ?? '' })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { transporterType: payload.transporterType ?? '' }
  const { errors } = validate(fields, payload)
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
