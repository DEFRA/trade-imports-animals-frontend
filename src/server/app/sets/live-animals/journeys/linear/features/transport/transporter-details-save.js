import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { dashboardPath, pagePath } from '../../../../../../shared/paths.js'
import * as kit from '../../../../../../shared/kit.js'
import { redirectUnlessOwnTransporterType } from './own-transporter-type.js'
import { transportersPage } from './page.js'
import {
  clearedEnteredTransporterPatch,
  clearEnteredTransporter,
  justAddedTransporterNamePatch,
  storeEnteredTransporter
} from './transporter-add-session.js'

export const CANCEL_ACTION = 'cancel'

const isCancelAction = (payload) => payload?.action === CANCEL_ACTION

export const CANCEL_LOG_MESSAGE =
  'Transporter add cancelled: the trader returned to the notifications list'

const cancelTransporterAdd = async (request, h, transporterType) => {
  const { journey, flowOnlyAnswers } = await state.get(request, h)
  await clearEnteredTransporter(request, h, flowOnlyAnswers, transporterType)
  request.logger.info(
    {
      journeyId: journey.journeyId,
      route: request.route?.path,
      reason: 'cancelled',
      transporterType
    },
    CANCEL_LOG_MESSAGE
  )
  return h.redirect(dashboardPath())
}

const rememberWhatWasEntered = async (request, h, transporterType, values) => {
  const { flowOnlyAnswers } = await state.get(request, h)
  await storeEnteredTransporter(
    request,
    h,
    flowOnlyAnswers,
    transporterType,
    values
  )
}

export const saveTransporterDetails =
  ({
    transporterType,
    trimmedValues,
    formErrors,
    record,
    render,
    saveTransporterToAddressBook
  }) =>
  async (request, h) => {
    const payload = request.payload ?? {}

    if (isCancelAction(payload)) {
      return cancelTransporterAdd(request, h, transporterType)
    }

    const redirect = await redirectUnlessOwnTransporterType(
      request,
      h,
      transporterType
    )
    if (redirect) {
      return redirect
    }

    const values = trimmedValues(payload)
    const allErrors = await formErrors(payload)
    if (Object.keys(allErrors).length > 0) {
      const { journey } = await state.get(request, h)
      await rememberWhatWasEntered(request, h, transporterType, values)
      return (
        await render(request, h, journey, values, { errors: allErrors })
      ).code(HTTP_STATUS_BAD_REQUEST)
    }

    const { failure } = await kit.recoverableSave(
      request,
      async () => {
        const { flowOnlyAnswers } = await state.get(request, h)
        await state.commit(request, h, {
          transporterType,
          ...(await record(values)),
          ...clearedEnteredTransporterPatch(flowOnlyAnswers, transporterType),
          ...justAddedTransporterNamePatch(values.nameOrOrganisationName)
        })
        await saveTransporterToAddressBook(request, values)
      },
      async () => {
        await state.commit(request, h, justAddedTransporterNamePatch(null))
        const { journey } = await state.get(request, h)
        await rememberWhatWasEntered(request, h, transporterType, values)
        return (
          await render(request, h, journey, values, {
            recoverableError: true
          })
        ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
      }
    )
    if (failure) {
      return failure
    }

    return h.redirect(
      kit.withChangeContext(
        request,
        pagePath(request.params.journeyId, transportersPage.slug)
      )
    )
  }
