import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { continueFromTransporterList } from './continue-from-transporter-list.js'

/**
 * @param {object} details the parts that differ between the commercial and private transporter pages
 * @param {Function} details.trimmedValues the entered values, trimmed, from the payload
 * @param {Function} details.formErrors the errors to show, in the order the page asks the fields
 * @param {Function} details.recordProvided whether the trader has begun a record
 * @param {Function} details.record the answer to commit, built from the values
 * @param {Function} details.render the page's own view
 * @param {Function} [details.remember] keeps the saved transporter for the organisation
 * @returns {Function} the POST handler: it refuses invalid details with status 400 and saves the rest
 */
export const saveTransporterDetails =
  ({ trimmedValues, formErrors, recordProvided, record, render, remember }) =>
  async (request, h) => {
    const payload = request.payload ?? {}
    const values = trimmedValues(payload)
    const allErrors = await formErrors(payload, values)
    if (Object.keys(allErrors).length > 0) {
      kit.logRefusal(request, { fieldErrors: allErrors })
      const { journey } = await state.get(request, h)
      return (
        await render(request, h, journey, values, { errors: allErrors })
      ).code(HTTP_STATUS_BAD_REQUEST)
    }

    const { value: saved, failure } = await kit.recoverableSave(
      request,
      async () => {
        if (!recordProvided(values)) {
          return state.get(request, h)
        }
        const committed = await state.commit(request, h, await record(values))
        await remember?.(request, values)
        return committed
      },
      async () => {
        const { journey } = await state.get(request, h)
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

    return continueFromTransporterList(request, h, saved.scope)
  }
