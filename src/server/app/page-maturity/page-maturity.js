import { config } from '../../../config/config.js'
import { copyFor } from '../shared/copy.js'
import { copy as copyCy } from './copy/copy.cy.js'
import { copy as copyEn } from './copy/copy.en.js'
import { BANNER_CLASSES, TAG_CLASSES } from './levels.js'
import { PAGE_LEVELS, SECTION_LEVELS } from './page-levels.js'

const pageMaturityCopy = copyFor({ en: copyEn, cy: copyCy })

const ERROR_TEMPLATE = 'shared/error'

const isErrorPage = (request) =>
  request.response?.source?.template === ERROR_TEMPLATE

// `/` as a section covers every route, so it is not given a second slash.
const sectionPrefix = (section) =>
  section.endsWith('/') ? section : `${section}/`

/**
 * Whether a route pattern is a section's own path or sits beneath it.
 *
 * @param {string} routePath - the hapi route pattern.
 * @param {string} section - the section path, such as `/live-animals/notifications`, or `/` for every route.
 * @returns {boolean} true when the route is in the section.
 */
export const isInSection = (routePath, section) =>
  routePath === section || routePath.startsWith(sectionPrefix(section))

/**
 * Finds the maturity level of a page from its hapi route pattern. An exact
 * entry in `PAGE_LEVELS` wins; otherwise the first section in `SECTION_LEVELS`
 * that holds the route applies.
 *
 * @param {string} [routePath] - the hapi route pattern, such as
 * `/live-animals/notifications/{journeyId}/origin`.
 * @param {ReadonlyArray<{ section: string, level: string }>} [sections] - the
 * sections to match, defaulting to `SECTION_LEVELS`.
 * @returns {string|undefined} a level id from `LEVELS`, or undefined when the
 * page has no level.
 */
export function pageLevelFor(routePath, sections = SECTION_LEVELS) {
  if (!routePath) {
    return undefined
  }
  if (Object.hasOwn(PAGE_LEVELS, routePath)) {
    return PAGE_LEVELS[routePath]
  }
  return sections.find(({ section }) => isInSection(routePath, section))?.level
}

/**
 * Builds the view context that puts a page's maturity level in the phase
 * banner. Empty when the switch is off, the page has no level, or the response
 * is the error page, so the rendered page is unchanged.
 *
 * @param {{ route?: { path?: string }, response?: { source?: { template?: string } } }} request - the hapi request being rendered.
 * @returns {{ pageMaturity?: { classes: string, tag: { text: string, classes: string }, text: string, hiddenPrefix: string } }}
 * the context to spread into the view model.
 */
export function pageMaturityContext(request) {
  if (!config.get('pageMaturityBanner.enabled') || isErrorPage(request)) {
    return {}
  }
  const level = pageLevelFor(request.route?.path)
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
