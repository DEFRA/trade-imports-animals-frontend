const SAVED_TEMPLATE_KEY = 'templateSaved'

/**
 * Remembers, in the session, the template just saved, so the next Manage
 * templates confirms it. The banner shows once: that page takes it.
 *
 * @param {object} request - the Hapi request
 * @param {{ name?: string }} saved - the template just saved
 * @returns {void}
 */
export const rememberSavedTemplate = (request, { name }) =>
  request.yar.set(SAVED_TEMPLATE_KEY, { name: name ?? '' })

/**
 * Takes the template just saved out of the session, so the banner shows once:
 * the first Manage templates after a save takes it, and a reload finds none.
 *
 * @param {object} request - the Hapi request
 * @returns {{ name: string }|null} the template just saved, or null when none was
 */
export const takeSavedTemplate = (request) => {
  const saved = request.yar.get(SAVED_TEMPLATE_KEY)
  request.yar.clear(SAVED_TEMPLATE_KEY)
  return saved ?? null
}
