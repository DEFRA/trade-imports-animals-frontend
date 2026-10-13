const UPDATED_TEMPLATE_KEY = 'templateUpdated'

/**
 * Remembers, in the session, the template just changed, so its page confirms
 * it. The banner shows once: the template page takes it.
 *
 * @param {object} request - the Hapi request
 * @param {{ name?: string }} updated - the template just changed
 * @returns {void}
 */
export const rememberUpdatedTemplate = (request, { name }) =>
  request.yar.set(UPDATED_TEMPLATE_KEY, { name: name ?? '' })

/**
 * Takes the template just changed out of the session, so the banner shows
 * once: the template page takes it, and a reload finds none.
 *
 * @param {object} request - the Hapi request
 * @returns {{ name: string }|null} the template just changed, or null when none was
 */
export const takeUpdatedTemplate = (request) => {
  const updated = request.yar.get(UPDATED_TEMPLATE_KEY)
  request.yar.clear(UPDATED_TEMPLATE_KEY)
  return updated ?? null
}
