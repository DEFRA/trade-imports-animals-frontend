import { AsyncLocalStorage } from 'node:async_hooks'
import { buildActor } from '../../common/helpers/actor-helpers.js'

// Template mode is a way of walking the journey's own pages, never a copy of
// them. A template-mode request runs the SAME handler as the notification
// route, inside this context, and the seams the page already reads through
// (the records port, the path builders, the page chrome) answer for the
// template instead. A later change to a journey page therefore reaches
// template mode with no template work.
const storage = new AsyncLocalStorage()

const NOTIFICATION_PREFIX = '/notifications/{journeyId}/'
const TEMPLATE_PREFIX = '/templates/{journeyId}/'
const OVERVIEW_PATH = '/notifications/{journeyId}'
const TEMPLATE_OVERVIEW_PATH = '/templates/{journeyId}'

/**
 * Whether the current request is walking a journey page in template mode.
 *
 * @returns {boolean} true inside {@link withTemplateMode}.
 */
export const inTemplateMode = () => storage.getStore() !== undefined

/**
 * The signed-in user who owns the template the request is working on.
 *
 * @returns {string|undefined} the owner id, or undefined outside template mode.
 */
export const templateOwnerId = () => storage.getStore()?.ownerId

/**
 * Runs `fn` in template mode for one owner.
 *
 * @param {string} ownerId - the signed-in user's id, from the verified session.
 * @param {Function} fn - what to run in template mode.
 * @returns {*} whatever `fn` returns.
 */
export const withTemplateMode = (ownerId, fn) => storage.run({ ownerId }, fn)

const underExcluded = (slug, excludedSlugs) =>
  excludedSlugs.some(
    (excluded) => slug === excluded || slug.startsWith(`${excluded}/`)
  )

const inTemplateModeFor = (method) =>
  typeof method === 'function'
    ? (request, h) =>
        withTemplateMode(buildActor(request.auth?.credentials)?.id, () =>
          method(request, h)
        )
    : method

// '' for the overview, the suffix for a journey page, null for anything else.
const slugOf = (path) => {
  if (path === OVERVIEW_PATH) {
    return ''
  }
  return path.startsWith(NOTIFICATION_PREFIX)
    ? path.slice(NOTIFICATION_PREFIX.length)
    : null
}

const twinOf = (route, slug) => ({
  ...route,
  path: slug === '' ? TEMPLATE_OVERVIEW_PATH : `${TEMPLATE_PREFIX}${slug}`,
  ...(route.handler && { handler: inTemplateModeFor(route.handler) }),
  ...(route.options && {
    options: {
      ...route.options,
      ...(route.options.handler && {
        handler: inTemplateModeFor(route.options.handler)
      })
    }
  })
})

/**
 * The template-mode twin of every journey route a template may walk.
 *
 * Each twin keeps the original route's method and options and runs the
 * original handler inside template mode, so no page is copied. The overview is
 * twinned at `/templates/{journeyId}` as the template's task list. Routes
 * outside the journey and the excluded slugs (and anything under them) get no
 * twin.
 *
 * @param {object[]} routes - the set's Hapi routes.
 * @param {object} options
 * @param {string[]} [options.excludedSlugs] - journey slugs template mode leaves out.
 * @returns {object[]} the twin routes, to register beside the originals.
 */
export const templateModeRoutes = (routes, { excludedSlugs = [] } = {}) =>
  routes
    .map((route) => ({ route, slug: slugOf(route.path) }))
    .filter(({ slug }) => slug !== null && !underExcluded(slug, excludedSlugs))
    .map(({ route, slug }) => twinOf(route, slug))
