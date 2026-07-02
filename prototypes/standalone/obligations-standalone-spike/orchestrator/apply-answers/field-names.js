/**
 * The form-name convention every rendered input follows — `name` for
 * single slots, `name__encodeURIComponent(fulfilmentId)` for indexed
 * slots. Encode and decode are the one seam between HTML form names and
 * the slot identity the writers below key on.
 */

const SEPARATOR = '__'

export const encodeFieldName = (name, fulfilmentId = null) =>
  fulfilmentId === null
    ? name
    : `${name}${SEPARATOR}${encodeURIComponent(fulfilmentId)}`

export function decodeFieldName(inputName) {
  const at = inputName.indexOf(SEPARATOR)
  return at === -1
    ? { name: inputName, fulfilmentId: null }
    : {
        name: inputName.slice(0, at),
        fulfilmentId: decodeURIComponent(inputName.slice(at + SEPARATOR.length))
      }
}
