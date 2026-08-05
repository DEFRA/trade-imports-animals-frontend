import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { purposeOptions } from '../../../../services/reference/purposes.js'
import { TEMPLATES } from '../../config.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { purposePage as page } from './page.js'

export const meta = { ...page, collects: ['reasonForImport'] }

const view = `${TEMPLATES}/features/purpose/template`
const copy = copyFor({ en, cy })

const fields = () =>
  compose(
    requiredOneOf(
      'reasonForImport',
      purposeOptions.map(({ value }) => value),
      copy.errors.reasonForImportRequired
    )
  )

const valuesFrom = (source) => ({
  reasonForImport: source.reasonForImport ?? ''
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
    reasonOptions: purposeOptions.map((option) => ({
      ...option,
      ...(copy.reasonHints[option.value]
        ? { hint: { text: copy.reasonHints[option.value] } }
        : {}),
      checked: option.value === values.reasonForImport
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
        reasonForImport: value.reasonForImport
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
