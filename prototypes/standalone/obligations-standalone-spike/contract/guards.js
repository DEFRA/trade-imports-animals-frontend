import {
  firstApplicablePage,
  NOT_APPLICABLE,
  SUBMITTED
} from '../flow-eval/index.js'
import { BASE } from '../journey/config.js'
import { hubPath, pagePath } from '../journey/paths.js'
import { journeyFlow, sectionOfPage } from './status.js'

/**
 * Graft 11 — [guards] as pure, unit-testable queries. All routing
 * decision logic lives here; routes/guard.js is a thin pre-handler that
 * adapts the Hapi request and is wired LAST, only after the three shared
 * specs are green.
 *
 * `guardPage(requestish, evaluation)` returns null (allow) or a redirect
 * URL. `requestish` is `{ method, surface, pageId }`: `method` the HTTP
 * verb, `surface` one of start | hub | page | quote-summary |
 * check-your-answers | confirmation, `pageId` the Flow page id when the
 * surface is `page` (the claims manage-list and add sub-page pass
 * pageId 'claims').
 *
 * The three rules, in order:
 *  1. Post-submit freeze (Rulings item 1): once Submitted, only the
 *     read-only CYA GET and the confirmation GET survive — every other
 *     journey route (hub, task pages, Change links, any POST) resolves
 *     to CYA. The start page stays open so a new journey can begin.
 *  2. Confirmation gate: pre-submit, confirmation redirects to the start
 *     page — the one route status-guarded in BOTH paradigms (spike-a
 *     parity).
 *  3. Deep-link Not Applicable redirect: a gated-out page resolves to
 *     its Section's first applicable page (hub fallback). Unit-pinned
 *     only — spike-a's parity evidence covers unknown addon steps alone
 *     (ruling record item 2 sub-question). Everything else pre-submit is
 *     OPEN, including direct-URL CYA and quote-summary (Rulings item 2):
 *     the hard gate lives at CYA POST in contract/submit.js, not here.
 */

export const SURFACES = Object.freeze([
  'start',
  'hub',
  'page',
  'quote-summary',
  'check-your-answers',
  'confirmation'
])

/** Has the one-way in-progress -> submitted flip happened? */
export const isFrozen = (evaluation) => evaluation.journeyState === SUBMITTED

const cyaPath = () => pagePath(journeyFlow().checkYourAnswers.slug)

const frozenTarget = (surface, method) => {
  const readOnlySurvivor =
    surface === 'check-your-answers' || surface === 'confirmation'
  return method === 'get' && readOnlySurvivor ? null : cyaPath()
}

const notApplicableTarget = (pageId, evaluation) => {
  if (evaluation.containerStatuses.pages[pageId] !== NOT_APPLICABLE) {
    return null
  }
  const section = sectionOfPage(pageId)
  const target = firstApplicablePage(section, evaluation)
  return target ? pagePath(target.slug) : hubPath()
}

/** Routing decision for one request: null to allow, or a redirect URL. */
export const guardPage = (requestish, evaluation) => {
  const { method = 'get', surface, pageId = null } = requestish
  if (!SURFACES.includes(surface)) {
    throw new Error(`Unknown guard surface "${surface}"`)
  }
  if (surface === 'start') {
    return null
  }
  if (isFrozen(evaluation)) {
    return frozenTarget(surface, method.toLowerCase())
  }
  if (surface === 'confirmation') {
    return BASE
  }
  if (surface === 'page' && pageId !== null) {
    return notApplicableTarget(pageId, evaluation)
  }
  return null
}
