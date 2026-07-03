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

export const decodeFieldName = (inputName) => {
  const separatorIndex = inputName.indexOf(SEPARATOR)
  return separatorIndex === -1
    ? { name: inputName, fulfilmentId: null }
    : {
        name: inputName.slice(0, separatorIndex),
        fulfilmentId: decodeURIComponent(
          inputName.slice(separatorIndex + SEPARATOR.length)
        )
      }
}
