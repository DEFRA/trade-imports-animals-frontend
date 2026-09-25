import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { hasErrors } from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as commodities from '../../../../services/commodities/index.js'
import { cphNumberPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { validation } from './validate.js'

export const meta = {
  ...page,
  collects: ['countyParishHoldingCph'],
  validation
}
const view = `${TEMPLATES}/features/cph-number/template`

const copy = copyFor({ en, cy })

const asArray = (value) => [value ?? []].flat()

export const isCphApplicable = (answers) =>
  asArray(answers.commodityLines).some((line) =>
    commodities.cphCommodities().includes(line?.commoditySelection)
  )

const hubEntryReturn = (request) =>
  request.query.return === 'addresses'
    ? pagePath(request.params.journeyId, 'addresses')
    : null

const render = (
  request,
  h,
  journey,
  values,
  { errors = {}, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubEntryReturn(request) ?? hubPath(journey.journeyId),
      journey,
      page,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const { values, errors } = await validation.onStored(answers)
  return render(request, h, journey, values, { errors })
}

const post = async (request, h) => {
  const { values, answers, errors } = await validation.onSubmit(
    request.payload ?? {}
  )
  if (hasErrors(errors)) {
    const { journey } = await state.get(request, h)
    return render(request, h, journey, values, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const { failure, value: committed } = await kit.recoverableSave(
    () => state.commit(request, h, answers),
    async () => {
      const { journey } = await state.get(request, h)
      return render(request, h, journey, values, {
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(
    kit.hubExitTarget(request) ??
      hubEntryReturn(request) ??
      (await kit.nextTarget(request, page, scope))
  )
}

export const routes = kit.pageRoutes(page, { get, post })
