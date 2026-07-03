import { evaluate, guardPage } from '../contract/index.js'
import { currentJourney } from '../journey/index.js'

/**
 * Graft 11 — the thin path-scoped pre-handler adapting a Hapi request to
 * `contract.guardPage`. Every routing decision (the post-submit freeze,
 * the confirmation gate, the deep-link Not Applicable redirect) is pure
 * and unit-tested in contract/guards.js; this file only reads the
 * route's `app` surface metadata, loads the cookie journey and turns a
 * non-null answer into a redirect.
 *
 * LANDED LAST (PLAN §b Step 11.6): written and unit-tested first, wired
 * into routes.js via `routeTable().map(withGuard)` only after the three
 * shared Playwright specs were green — the post-submit freeze branch
 * (Rulings item 1) arrived with that wiring.
 */

export const guardPreHandler = (request, h) => {
  const { surface, pageId = null } = request.route.settings.app ?? {}
  const journey = currentJourney(request, h)
  const target = guardPage(
    { method: request.method, surface, pageId },
    evaluate(journey)
  )
  return target ? h.redirect(target).takeover() : h.continue
}

/**
 * Wrap one route with the guard pre-handler. Routes without `app`
 * surface metadata (the model endpoints — sessionless interrogation)
 * pass through untouched.
 */
export const withGuard = (route) => {
  if (!route.options?.app?.surface) {
    return route
  }
  return {
    ...route,
    options: {
      ...route.options,
      pre: [{ method: guardPreHandler }, ...(route.options.pre ?? [])]
    }
  }
}
