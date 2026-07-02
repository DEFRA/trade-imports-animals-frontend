import { modelJson, submit } from '../../contract/index.js'
import { currentJourney, pagePath } from '../../journey/index.js'
import { renderCya } from './check-your-answers.js'

/**
 * CYA POST — the one hard gate in the journey (Rulings item 2). The
 * contract re-checks Fulfilled from a fresh evaluation, never trusting
 * the button; on pass the journey takes the one-way flip to submitted
 * and the browser moves on to confirmation.
 *
 * Graft 3 — a stale POST (state invalidated between the CYA render and
 * the submit) re-renders CYA as a 200 with the gaps called out in a GDS
 * error summary: never a 500, never a redirect elsewhere. A re-POST of
 * an already-submitted journey lands here too, re-rendering the
 * read-only CYA with nothing missing.
 */

const flow = JSON.parse(modelJson().flow)

export const submitCheckYourAnswers = (request, h) => {
  const journey = currentJourney(request, h)
  const result = submit(journey)
  if (result.ok) {
    return h.redirect(pagePath(flow.confirmation.slug))
  }
  return renderCya(result.evaluation, h, { errorSummary: result.errorSummary })
}
