import { pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as transportReference from '../../../../../../../services/transport-reference/index.js'
import { COMMERCIAL } from '../../../../../../../services/transporters/index.js'
import {
  commercialTransporterDetailsPage,
  privateTransporterDetailsPage,
  transporterAddPage as page,
  transportersPage
} from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import {
  chosenTransporterType,
  takeTransporterTypeRestartFlag,
  transporterTypeChosenPatch
} from '../transporter-add-session.js'

const view = `${TEMPLATES}/features/transport/transporter-add/transporter-add`

const copy = copyFor({ en, cy }).transporterAdd

const fields = compose(
  requiredOneOf(
    'transporterType',
    transportReference.transporterTypes(),
    copy.errors.transporterTypeRequired
  )
)

const render = (request, h, journey, values, { errors = {} } = {}) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: kit.withChangeContext(
        request,
        pagePath(journey.journeyId, transportersPage.slug)
      ),
      journey,
      page,
      showJourneyStrip: false
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers, flowOnlyAnswers } = await state.get(request, h)
  const restarted = await takeTransporterTypeRestartFlag(
    request,
    h,
    flowOnlyAnswers
  )
  const storedTransporterType =
    chosenTransporterType(flowOnlyAnswers) ?? answers.transporterType ?? ''
  return render(request, h, journey, {
    transporterType: restarted ? '' : storedTransporterType
  })
}

const nextSlugForTransporterType = (transporterType) =>
  transporterType === COMMERCIAL
    ? commercialTransporterDetailsPage.slug
    : privateTransporterDetailsPage.slug

const logRefusalUnlessNothingWasChosen = (
  request,
  { errors, transporterType }
) => {
  if (transporterType !== '') {
    kit.logRefusal(request, { fieldErrors: errors, transporterType })
  }
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const { value, errors } = validate(fields, payload)
  const values = { transporterType: value.transporterType ?? '' }
  if (errors) {
    const { journey } = await state.get(request, h)
    logRefusalUnlessNothingWasChosen(request, {
      errors,
      transporterType: values.transporterType
    })
    return render(request, h, journey, values, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  await state.commit(
    request,
    h,
    transporterTypeChosenPatch(values.transporterType)
  )
  return h.redirect(
    kit.withChangeContext(
      request,
      pagePath(
        request.params.journeyId,
        nextSlugForTransporterType(values.transporterType)
      )
    )
  )
}

export const routes = kit.pageRoutes(page, { get, post })
