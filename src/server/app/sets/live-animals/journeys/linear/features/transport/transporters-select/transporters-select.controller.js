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
import * as transporters from '../../../../../../../services/transporters/index.js'
import { transporterAddPage, transportersSelectPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { addressSummary } from '../transporters/transporter-record.js'
import { continueFromTransporterList } from '../continue-from-transporter-list.js'

const view = `${TEMPLATES}/features/transport/transporters-select/transporters-select`

const copy = copyFor({ en, cy }).transportersSelect

const fields = compose(
  oneOf(
    'commercialTransporter',
    transporters.commercialParties().map((option) => option.id),
    copy.errors.transporterRequired
  )
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
        pagePath(journey.journeyId, transporterAddPage.slug)
      ),
      journey,
      page,
      recoverableError
    }),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    transporterOptions: transporters.commercialParties().map((option) => ({
      value: option.id,
      text: option.name,
      hint: {
        text: copy.optionHint(
          addressSummary(option.address),
          option.approvalNumber
        )
      },
      checked: option.name === values.selectedName
    }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(request, h, journey, {
    selectedName: answers.commercialTransporter?.name
  })
}

const commercialTransporterRecord = (chosen) => ({
  commercialTransporter: {
    name: chosen.name,
    address: { ...chosen.address },
    approvalNumber: chosen.approvalNumber
  }
})

const commitOrSkip = (request, h, chosen) =>
  chosen
    ? state.commit(request, h, commercialTransporterRecord(chosen))
    : state.get(request, h)

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) {
    kit.logRefusal(request, { fieldErrors: errors })
    const { journey } = await state.get(request, h)
    return render(request, h, journey, {}, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const chosen = transporters.party(payload.commercialTransporter)
  const { value: saved, failure } = await kit.recoverableSave(
    request,
    () => commitOrSkip(request, h, chosen),
    async () => {
      const { journey } = await state.get(request, h)
      return render(
        request,
        h,
        journey,
        { selectedName: chosen?.name },
        { recoverableError: true }
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  return continueFromTransporterList(request, h, saved.scope)
}

export const routes = kit.pageRoutes(page, { get, post })
