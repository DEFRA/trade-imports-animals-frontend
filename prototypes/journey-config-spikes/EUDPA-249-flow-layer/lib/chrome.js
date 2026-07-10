/**
 * Shared layout / template chrome — copy strings the layout template
 * needs on every request (phase banner, service name, breadcrumb text,
 * back link, page-title error prefix and suffix). Every render-time
 * controller spreads this into its view context so the layout can read
 * `chrome.*` fields without every controller having to know the full
 * shape.
 *
 * See `locales/en.json` `chrome.*` bucket. Coverage test walks
 * `CHROME_KEYS` (exported below) and asserts each key resolves.
 */

import { t } from './i18n.js'

const BASE = '/prototype/eudpa-249'

/**
 * Every message key referenced by `chrome()` below. Exported so
 * `i18n-coverage.test.js` can walk a static list rather than firing
 * the helper.
 */
export const CHROME_KEYS = [
  'chrome.serviceName',
  'chrome.taskList',
  'chrome.back',
  'chrome.saveAndContinue',
  'chrome.errorSummaryTitle',
  'chrome.phaseBanner.tag',
  'chrome.phaseBanner.html',
  'chrome.pageTitle.errorPrefix',
  'chrome.pageTitle.suffix'
]

/** Resolved chrome bag for the current request. Currently English-only;
 *  when locale threading lands (see NEXT.md P0.5), this gains a
 *  `request` argument so it can pick the locale before resolving. */
export function chrome() {
  return {
    serviceName: t('chrome.serviceName'),
    serviceUrl: `${BASE}/task-list`,
    taskListText: t('chrome.taskList'),
    backText: t('chrome.back'),
    saveAndContinueText: t('chrome.saveAndContinue'),
    errorSummaryTitle: t('chrome.errorSummaryTitle'),
    phaseBannerTag: t('chrome.phaseBanner.tag'),
    phaseBannerHtml: t('chrome.phaseBanner.html'),
    pageTitleErrorPrefix: t('chrome.pageTitle.errorPrefix'),
    pageTitleSuffix: t('chrome.pageTitle.suffix')
  }
}
