import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
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
import { transporterAddPage, transportersPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { addressSummary, transporterAnswer } from './transporter-record.js'

/** The transporter list — the journey's one transporter step.
 *
 * It declares all three transporter answers because picking a row settles all
 * of them: the record carries its own type, so the type is read off the pick
 * rather than asked in front of the list. The add spokes behind
 * "Add a transporter" write the same answers without declaring them, the way
 * the address pickers write the parties the addresses page declares. */
export const meta = {
  ...page,
  collects: ['transporterType', 'commercialTransporter', 'privateTransporter']
}
const view = `${TEMPLATES}/features/transport/transporters/transporters`

const copy = copyFor({ en, cy }).transporters

const fields = compose(
  oneOf(
    'transporter',
    transporters.parties().map((option) => option.id),
    copy.errors.transporterRequired
  )
)

const optionHint = (option) => {
  const type = copy.types[option.type]
  const address = addressSummary(option.address)
  return option.approvalNumber
    ? copy.optionHintApproved(type, address, option.approvalNumber)
    : copy.optionHint(type, address)
}

const render = (
  request,
  h,
  journey,
  values,
  { errors = {}, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      page,
      recoverableError
    }),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    // Reached from a Change link, the add route has to keep the context or
    // the trader is dropped into the journey instead of the summary.
    addHref: kit.withChangeContext(
      request,
      pagePath(journey.journeyId, transporterAddPage.slug)
    ),
    transporterOptions: transporters.parties().map((option) => ({
      value: option.id,
      text: option.name,
      hint: { text: optionHint(option) },
      checked: option.id === values.selectedId
    }))
  })

/** The record behind the answers already on the notification, so a returning
 * trader sees their pick still checked. Matched on name: the notification
 * stores the transporter's details, not the id of the row it came from. */
const selectedIdFor = (answers) => {
  const chosenName =
    answers.commercialTransporter?.name ?? answers.privateTransporter?.name
  return transporters.parties().find((option) => option.name === chosenName)?.id
}

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(request, h, journey, { selectedId: selectedIdFor(answers) })
}

const commitOrSkip = (request, h, chosen) =>
  chosen
    ? state.commit(request, h, transporterAnswer(chosen))
    : state.get(request, h)

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(request, h, journey, {}, { errors })
  }

  const chosen = transporters.party(payload.transporter)
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
        { selectedId: chosen?.id },
        { recoverableError: true }
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
