import * as state from '../../../../../../engine/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { continueFromTransporterList } from './continue-from-transporter-list.js'

/**
 * @param {object} arm the parts that differ between the two arms
 * @param {Function} arm.trimmedValues the entered values, trimmed, from the payload
 * @param {Function} arm.formErrors the errors to show, in the order the page asks the fields
 * @param {Function} arm.recordProvided whether the trader has begun a record
 * @param {Function} arm.record the answer to commit, built from the values
 * @param {Function} arm.render the arm's own view
 * @param {Function} [arm.remember] keeps the saved transporter for the organisation
 * @returns {Function} the arm's POST handler
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
      return render(request, h, journey, values, { errors: allErrors })
    }

    let committed
    const { failure } = await kit.recoverableSave(
      request,
      async () => {
        if (!recordProvided(values)) {
          committed = await state.get(request, h)
          return
        }
        committed = await state.commit(request, h, await record(values))
        await remember?.(request, values)
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

    const { scope } = committed
    return continueFromTransporterList(request, h, scope)
  }
