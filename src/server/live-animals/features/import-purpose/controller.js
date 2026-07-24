import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import { importPurposePage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['purposeInInternalMarket'] }
const view = `${TEMPLATES}/features/import-purpose/template`

const copy = copyFor({ en, cy })

const HTTP_STATUS_BAD_REQUEST = 400

const fields = compose(
  oneOf(
    'purposeInInternalMarket',
    importReasonPurpose.purposes().map((option) => option.value)
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
    purposeOptions: importReasonPurpose.purposes().map((option) => ({
      ...option,
      hint: { text: copy.purposeHints[option.value] },
      checked: option.value === values.purposeInInternalMarket
    }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, {
    purposeInInternalMarket: answers.purposeInInternalMarket ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    purposeInInternalMarket: payload.purposeInInternalMarket ?? ''
  }
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors).code(HTTP_STATUS_BAD_REQUEST)
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
