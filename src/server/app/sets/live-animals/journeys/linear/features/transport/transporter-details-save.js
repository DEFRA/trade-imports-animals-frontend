import * as state from '../../../../../../engine/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { transportersPage } from './page.js'

/** The save half of an add-transporter form.
 *
 * Both arms of the add route save the same way, whether the trader is adding a
 * commercial transporter or a private one: show the form again with the errors
 * if it does not validate, otherwise write the record — or write nothing at
 * all, if they left the whole form blank — and carry the journey on from the
 * transporter list rather than from the spoke they are standing on. Only the
 * fields and the record they build differ between the two arms, so those are
 * handed in and the sequence is written once.
 *
 * An arm may also keep what it saved somewhere the next notification can find
 * it, which is what stops a trader retyping the same transporter every week.
 * That happens only after the notification itself has taken the answer, so a
 * failed save never leaves a transporter on the list that no notification
 * names.
 *
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
    const allErrors = formErrors(payload, values)
    if (Object.keys(allErrors).length > 0) {
      const { journey } = await state.get(request, h)
      return render(request, h, journey, values, { errors: allErrors })
    }

    let committed
    const { failure } = await kit.recoverableSave(
      async () => {
        if (!recordProvided(values)) {
          committed = await state.get(request, h)
          return
        }
        committed = await state.commit(request, h, record(values))
        remember?.(request, values)
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

    // Adding a transporter finishes the transporter step, so the journey carries
    // on from the list rather than from this spoke.
    const { scope } = committed
    return h.redirect(await kit.nextTarget(request, transportersPage, scope))
  }
