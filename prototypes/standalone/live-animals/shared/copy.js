const DEFAULT_LOCALE = 'en'

/**
 * Resolve a feature's copy module for a locale, falling back to English.
 *
 * The i18n seam: each feature owns `copy.<locale>.js` modules beside its
 * controller and passes them here as `{ en, cy, ... }`. Only `en` exists
 * until a second language is commissioned; locale selection (cookie,
 * language toggle) plugs in via the `locale` argument when it is.
 *
 * @param {Record<string, object>} locales - copy modules keyed by locale.
 * @param {string} [locale] - the locale to resolve.
 * @returns {object} the locale's copy module, or English when unknown.
 */
export const copyFor = (locales, locale = DEFAULT_LOCALE) =>
  locales[locale] ?? locales[DEFAULT_LOCALE]
