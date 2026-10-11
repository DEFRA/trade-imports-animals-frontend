// The stub store starts empty and holds no examples: the service shows only
// templates a user has really saved (c-183). Keyed by owner id; each value is
// an array of rows { id, name, setId, created, status, version, fulfilments }
// with `created` an ISO string.
const store = new Map()

export const stubTemplates = store

const IN_PROGRESS = 'IN_PROGRESS'
const SAVED = 'SAVED'

const newestFirst = (left, right) => right.created.localeCompare(left.created)

const rowsOf = (ownerId) => store.get(ownerId) ?? []

const findRow = (ownerId, id) => rowsOf(ownerId).find((row) => row.id === id)

const toTemplate = ({ id, name, setId, created }) => ({
  id,
  name,
  setId,
  created
})

const toTemplateDetail = (row) => ({
  ...toTemplate(row),
  status: row.status,
  version: row.version,
  fulfilments: structuredClone(row.fulfilments)
})

const changeRow = (ownerId, id, changes) => {
  const row = findRow(ownerId, id)
  if (!row) {
    return undefined
  }
  Object.assign(row, changes, { version: row.version + 1 })
  return toTemplateDetail(row)
}

/**
 * The owner's saved stub templates, newest saved first. A template still being
 * created is not listed.
 *
 * @param {string} ownerId - the signed-in user's id
 * @returns {Array<{ id: string, name: string, setId: string, created: string }>} the owner's templates
 */
export const list = (ownerId) =>
  rowsOf(ownerId)
    .filter((row) => row.status !== IN_PROGRESS)
    .sort(newestFirst)
    .map(toTemplate)

/**
 * Starts a stub template, held as in progress.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {{ setId: string, name: string }} details - the type and name to record
 * @returns {object} the template as stored
 */
export const start = (ownerId, { setId, name }) => {
  const row = {
    id: crypto.randomUUID(),
    name,
    setId,
    created: new Date().toISOString(),
    status: IN_PROGRESS,
    version: 0,
    fulfilments: []
  }
  store.set(ownerId, [...rowsOf(ownerId), row])
  return toTemplateDetail(row)
}

/**
 * One of the owner's stub templates.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @returns {object|undefined} the template, or undefined when the owner has none by that id
 */
export const get = (ownerId, id) => {
  const row = findRow(ownerId, id)
  return row ? toTemplateDetail(row) : undefined
}

/**
 * Records a type and name on one of the owner's stub templates.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @param {{ setId: string, name: string }} details - the type and name to record
 * @returns {object|undefined} the template as stored, or undefined when not found
 */
export const updateDetails = (ownerId, id, { setId, name }) =>
  changeRow(ownerId, id, { setId, name })

/**
 * Replaces the answers one of the owner's stub templates holds.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @param {object[]} fulfilments - the encoded answers to hold
 * @returns {object|undefined} the template as stored, or undefined when not found
 */
export const replaceFulfilments = (ownerId, id, fulfilments) =>
  changeRow(ownerId, id, { fulfilments: structuredClone(fulfilments) })

/**
 * Saves one of the owner's stub templates, so it is listed.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @returns {object|undefined} the template as stored, or undefined when not found
 */
export const save = (ownerId, id) => changeRow(ownerId, id, { status: SAVED })
