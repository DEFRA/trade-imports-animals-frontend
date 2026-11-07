import { pagePath } from '../../../../../../shared/paths.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { transporterAddPage } from './page.js'

export const OWN_TRANSPORTER_TYPE_REDIRECT_MESSAGE =
  'Redirected to the transporter type question: the stored transporter type does not match'

export const redirectUnlessOwnTransporterType = async (
  request,
  h,
  transporterType
) => {
  const { journey, answers } = await state.get(request, h)
  if (answers.transporterType === transporterType) {
    return undefined
  }
  request.logger.info(
    {
      journeyId: journey.journeyId,
      route: request.route?.path,
      reason: 'not-own-transporter-type',
      transporterType,
      storedTransporterType: answers.transporterType ?? 'none'
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
