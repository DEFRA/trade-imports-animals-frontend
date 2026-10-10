import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { hasErrors } from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as certification from '../../../../../../services/certification-purposes/index.js'
import { additionalDetailsPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { unweanedApplies, validation } from './validate.js'

export { unweanedApplies }

export const meta = {
  ...page,
  collects: ['animalsCertifiedFor', 'containsUnweanedAnimals'],
  validation
}
const view = `${TEMPLATES}/features/additional-details/template`

const copy = copyFor({ en, cy })

const UNWEANED_LABEL = { yes: copy.unweaned.yes, no: copy.unweaned.no }

const render = async (
  request,
  h,
  { journey, answers },
  { values, showUnweaned, errors = {}, recoverableError = false }
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: await kit.runBackLink(request, page, answers),
      journey,
      page,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    showUnweaned,
    certifiedOptions: certification.certificationPurposes().map((option) => ({
      ...option,
      checked: option.value === values.animalsCertifiedFor
    })),
    unweanedOptions: Object.entries(UNWEANED_LABEL).map(([value, text]) => ({
      value,
      text,
      checked: value === values.containsUnweanedAnimals
    }))
  })

const get = async (request, h) => {
  const { journey, answers, scope } = await state.get(request, h)
  const showUnweaned = scope.has('containsUnweanedAnimals')
  const { values, errors } = await validation.onStored(answers, {
    showUnweaned
  })
  return render(
    request,
    h,
    { journey, answers },
    { values, showUnweaned, errors }
  )
}

const answeredOnly = (patch) =>
  Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== ''))

const post = async (request, h) => {
  const { journey, scope, answers: storedAnswers } = await state.get(request, h)
  const showUnweaned = scope.has('containsUnweanedAnimals')
  const { values, answers, errors } = await validation.onSubmit(
    request.payload ?? {},
    { showUnweaned, allowMissing: kit.isHubExit(request) }
  )
  if (hasErrors(errors)) {
    return (
      await render(
        request,
        h,
        { journey, answers: storedAnswers },
        { values, showUnweaned, errors }
      )
    ).code(HTTP_STATUS_BAD_REQUEST)
  }

  const patch = {
    animalsCertifiedFor: answers.animalsCertifiedFor,
    ...(showUnweaned
      ? { containsUnweanedAnimals: answers.containsUnweanedAnimals }
      : {})
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, answeredOnly(patch))
    },
    async () =>
      (
        await render(
          request,
          h,
          { journey, answers: storedAnswers },
          { values, showUnweaned, recoverableError: true }
        )
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
