import { pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import {
  compose,
  oneOf,
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

const view = `${TEMPLATES}/features/transport/transporter-add/transporter-add`

const copy = copyFor({ en, cy }).transporterAdd

const fields = compose(
  oneOf('transporterType', transportReference.transporterTypes())
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
      backLink: kit.withChangeContext(
        request,
        pagePath(journey.journeyId, transportersPage.slug)
      ),
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
  return render(request, h, journey, {
    transporterType: answers.transporterType ?? ''
  })
}

const nextSlugForTransporterType = (transporterType) => {
  if (transporterType === COMMERCIAL) {
    return commercialTransporterDetailsPage.slug
  }
  return transporterType === ''
    ? transportersPage.slug
    : privateTransporterDetailsPage.slug
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { transporterType: payload.transporterType ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(request, h, journey, values, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const { failure } = await kit.recoverableSave(
    request,
    async () => {
      await state.commit(request, h, values)
    },
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
