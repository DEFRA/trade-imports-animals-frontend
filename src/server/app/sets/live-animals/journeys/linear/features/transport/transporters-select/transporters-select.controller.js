import { pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../../lib/http-status.js'
import {
  compose,
  oneOf,
  validate
} from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as transporters from '../../../../../../../services/transporters/index.js'
import {
  transporterAddPage,
  transportersPage,
  transportersSelectPage as page
} from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { addressSummary } from '../transporters/transporter-record.js'

/** The approved commercial register.
 *
 * A second way of picking a commercial transporter the service already knows
 * about, kept from the flow that asked the type before the list. Nothing links
 * to it now that the add route's commercial arm is the add-commercial form and
 * the transporter list carries the register's rows itself. The
 * `commercialTransporter` it writes is declared by the transporter list, which
 * is where the answer is normally given. */
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
    const { journey } = await state.get(request, h)
    return render(request, h, journey, {}, { errors })
  }

  const chosen = transporters.party(payload.commercialTransporter)
  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await commitOrSkip(request, h, chosen)
    },
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

  // Adding a transporter finishes the transporter step, so the journey carries
  // on from the list rather than from this spoke.
  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, transportersPage, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
