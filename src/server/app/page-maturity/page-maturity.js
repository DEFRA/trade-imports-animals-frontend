import { config } from '../../../config/config.js'
import { copyFor } from '../shared/copy.js'
import { copy as copyCy } from './copy/copy.cy.js'
import { copy as copyEn } from './copy/copy.en.js'
import { BANNER_CLASSES, LEVELS, TAG_CLASSES } from './levels.js'

const pageMaturityCopy = copyFor({ en: copyEn, cy: copyCy })

const ERROR_TEMPLATE = 'shared/error'

const isErrorPage = (request) =>
  request.response?.source?.template === ERROR_TEMPLATE

/**
 * Finds the maturity level of a page from the `maturity` its feature's
 * `page.js` sets. A page that sets none is Exploring.
 *
 * @param {{ maturity?: string }} [page] - the page descriptor the matched
 * route carries.
 * @returns {string|undefined} a level id from `LEVELS`, or undefined when
 * there is no page.
 */
export function pageLevelFor(page) {
  if (!page) {
    return undefined
  }
  return page.maturity ?? LEVELS.exploring
}

/**
 * Builds the view context that puts a page's maturity level in the phase
 * banner. Empty when the switch is off, the matched route carries no page, or
 * the response is the error page, so the rendered page is unchanged.
 *
 * @param {{ route?: { settings?: { app?: { page?: { maturity?: string } } } }, response?: { source?: { template?: string } } }} request - the hapi request being rendered.
 * @returns {{ pageMaturity?: { classes: string, tag: { text: string, classes: string }, text: string, hiddenPrefix: string } }}
 * the context to spread into the view model.
 */
export function pageMaturityContext(request) {
  if (!config.get('pageMaturityBanner.enabled') || isErrorPage(request)) {
    return {}
  }
  const level = pageLevelFor(request.route?.settings?.app?.page)
  if (!level) {
    return {}
  }
  const levelCopy = pageMaturityCopy.levels[level]
  return {
    pageMaturity: {
      classes: BANNER_CLASSES[level],
      tag: { text: levelCopy.tag, classes: TAG_CLASSES[level] },
      text: levelCopy.text,
      hiddenPrefix: pageMaturityCopy.hiddenPrefix
    }
  }
}
