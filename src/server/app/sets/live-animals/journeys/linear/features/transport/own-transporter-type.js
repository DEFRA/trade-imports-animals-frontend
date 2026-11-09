import { pagePath } from '../../../../../../shared/paths.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { transporterAddPage } from './page.js'
import { chosenTransporterType } from './transporter-add-session.js'

export const OWN_TRANSPORTER_TYPE_REDIRECT_MESSAGE =
  'Redirected to the transporter type question: the stored transporter type does not match'

export const redirectUnlessOwnTransporterType = async (
  request,
  h,
  transporterType
) => {
  const { journey, answers, flowOnlyAnswers } = await state.get(request, h)
  const intendedTransporterType =
    chosenTransporterType(flowOnlyAnswers) ?? answers.transporterType
  if (intendedTransporterType === transporterType) {
    return undefined
  }
  request.logger.info(
    {
      journeyId: journey.journeyId,
      route: request.route?.path,
      reason: 'not-own-transporter-type',
      transporterType,
      storedTransporterType: intendedTransporterType ?? 'none'
    },
    OWN_TRANSPORTER_TYPE_REDIRECT_MESSAGE
  )
  return h.redirect(
    kit.withChangeContext(
      request,
      pagePath(journey.journeyId, transporterAddPage.slug)
    )
  )
}
