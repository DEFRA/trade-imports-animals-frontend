import { JSDOM } from 'jsdom'

/**
 * Parses rendered HTML into a DOM document to query.
 *
 * @param {string} html
 * @returns {Document}
 */
export const documentOf = (html) => new JSDOM(html).window.document

/**
 * The trimmed text of an element.
 *
 * @param {Element} element
 * @returns {string}
 */
export const trimmedTextOf = (element) => element.textContent.trim()
