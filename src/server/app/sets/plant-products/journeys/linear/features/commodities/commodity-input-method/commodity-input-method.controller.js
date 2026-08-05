import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { hubPath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { commodityInputMethodPage as page } from '../page.js'

export const meta = { ...page, collects: ['commodityInputMethod'] }

const view = `${TEMPLATES}/features/commodities/commodity-input-method/commodity-input-method`
const copy = copyFor({ en, cy }).inputMethod
const INPUT_METHODS = ['MANUAL']

const fields = () =>
  compose(
    requiredOneOf('commodityInputMethod', INPUT_METHODS, copy.errors.required)
  )

const valuesFrom = (source) => ({
  commodityInputMethod: source.commodityInputMethod ?? ''
})

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
    inputMethodOptions: INPUT_METHODS.map((value) => ({
      value,
      text: copy.options[value].label,
      hint: { text: copy.options[value].hint },
      label: { classes: 'govuk-!-font-weight-bold' },
      checked: value === values.commodityInputMethod
    }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, valuesFrom(answers))
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = valuesFrom(payload)
  const { value, errors } = validate(fields(), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, {
        commodityInputMethod: value.commodityInputMethod
      })
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(h, journey, values, {}, true).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
    }
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
