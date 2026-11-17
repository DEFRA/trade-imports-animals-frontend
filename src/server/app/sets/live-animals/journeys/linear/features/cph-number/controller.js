import { pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { hasErrors } from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { commodityCodesOf, linesOf } from '../commodities/lines.js'
import { addressesPage } from '../addresses/page.js'
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

const addressesBackLink = (request) =>
  kit.carryTrail(
    request,
    pagePath(request.params.journeyId, addressesPage.slug)
  )

const redirectOnward = (request, h, scope) =>
  h.redirect(
    kit.nextTargetKeepingTrail(request, page, scope, {
      saveChoice: { hubExit: false }
    })
  )

const isOutOfScope = (scope) => !scope.has('countyParishHoldingCph')

const logOutOfScope = (request, answers, evaluation) =>
  request.logger.info(
    {
      journeyId: request.params.journeyId,
      reason: 'cph-number-not-in-scope',
      commodityCodes: commodityCodesOf(linesOf(answers, evaluation))
    },
    'County parish holding number skipped: no commodity on this consignment needs one'
  )

const render = (
  request,
  h,
  journey,
  values,
  { errors = {}, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: addressesBackLink(request),
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
  const { journey, evaluation, scope, answers } = await state.get(request, h)
  if (isOutOfScope(scope)) {
    logOutOfScope(request, answers, evaluation)
    return redirectOnward(request, h, scope)
  }
  const { values, errors } = await validation.onStored(answers)
  return render(request, h, journey, values, { errors })
}

const post = async (request, h) => {
  const { evaluation, scope, storedAnswers } = await state.get(request, h)
  if (isOutOfScope(scope)) {
    logOutOfScope(request, storedAnswers, evaluation)
    return redirectOnward(request, h, scope)
  }

  const { values, answers, errors } = await validation.onSubmit(
    request.payload ?? {}
  )
  if (hasErrors(errors)) {
    const { journey: invalidJourney } = await state.get(request, h)
    return render(request, h, invalidJourney, values, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const { failure, value: committed } = await kit.recoverableSave(
    request,
    () => state.commit(request, h, answers),
    async () => {
      const { journey: failedJourney } = await state.get(request, h)
      return render(request, h, failedJourney, values, {
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  const { scope: savedScope } = committed
  return redirectOnward(request, h, savedScope)
}

export const routes = kit.pageRoutes(page, { get, post })
