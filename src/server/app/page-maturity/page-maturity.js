import { config } from '../../../config/config.js'
import { copyFor } from '../shared/copy.js'
import { copy as copyEn } from './copy/copy.en.js'
import { copy as copyCy } from './copy/copy.cy.js'
import { TAG_CLASSES } from './levels.js'
import { PAGE_LEVELS, SECTION_LEVELS } from './page-levels.js'

const copy = copyFor({ en: copyEn, cy: copyCy })

const ERROR_TEMPLATE = 'shared/error'

const isErrorPage = (request) =>
  request.response?.source?.template === ERROR_TEMPLATE

/**
 * The maturity level of a page, found from its hapi route pattern. An exact
 * entry in the page map wins; otherwise a section covers its own path and
 * everything beneath it.
 *
 * @param {string} [routePath] - the route pattern, such as
 * `/live-animals/notifications/{journeyId}/origin`.
 * @returns {string|undefined} a level id, or undefined when the page is unlisted.
 */
export function pageLevelFor(routePath) {
  if (!routePath) {
    return undefined
  }
  if (Object.hasOwn(PAGE_LEVELS, routePath)) {
    return PAGE_LEVELS[routePath]
  }
  return SECTION_LEVELS.find(
    ({ section }) =>
      routePath === section || routePath.startsWith(`${section}/`)
  )?.level
}

/**
 * The view-context entry that puts a page's maturity level in the phase banner.
 *
 * @param {object} request - the hapi request.
 * @returns {{ pageMaturity?: object }} `pageMaturity` with the tag, the line and
 * the screen-reader prefix, or an empty object when the switch is off, the
 * page is unlisted, or the response is the error page.
 */
export function pageMaturityContext(request) {
  if (!config.get('pageMaturityBanner.enabled') || isErrorPage(request)) {
    return {}
  }
  const level = pageLevelFor(request.route?.path)
  if (!level) {
    return {}
  }
  const { tag, text } = copy.levels[level]
  return {
    pageMaturity: {
      tag: { text: tag, classes: TAG_CLASSES[level] },
      text,
      hiddenPrefix: copy.hiddenPrefix
    }
  }
}
