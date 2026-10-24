import { obligationByName, obligations } from '../model/obligations/manifest.js'
import { isGroup } from '../model/obligations/manifest-graph.js'
import { flowOnlyKeys } from './flow-only-keys.js'

const namesUpTo = (obligation) =>
  obligation ? [...namesUpTo(obligation.within), obligation.name] : []

const templatePathOf = (obligation) => namesUpTo(obligation).join('.')

export function* walkObligations() {
  for (const obligation of obligations()) {
    yield { templatePath: templatePathOf(obligation), obligation }
  }
}

export const obligationByPath = (dottedNamePath) =>
  obligations().find(
    (obligation) => templatePathOf(obligation) === dottedNamePath
  )

class SystemPopulated extends Set {
  has(name) {
    return super.has(name) || obligationByName(name)?.system === true
  }
}

export const SYSTEM_POPULATED = new SystemPopulated()

export const ENFORCED_AT_CONTINUE = new Set([
  'countryOfOrigin',
  'commodityCode'
])

export const ENTRY_CAP_FIELD_BY_COLLECTION = {
  animalIdentifiers: 'numberOfAnimalsQuantity'
}

export const flowOnlyAnswersFrom = (answers) =>
  Object.fromEntries(
    flowOnlyKeys()
      .filter(
        (key) => Object.hasOwn(answers ?? {}, key) && answers[key] !== undefined
      )
      .map((key) => [key, answers[key]])
  )

const SYSTEM_ANSWER_KEYS = new Set(['referenceNumber'])

const topLevelKeys = () =>
  new Set([
    ...obligations()
      .filter((obligation) => !obligation.within)
      .map((obligation) => obligation.name),
    ...flowOnlyKeys(),
    ...SYSTEM_ANSWER_KEYS
  ])

const memberKeysOf = (group) =>
  new Set(
    obligations()
      .filter((obligation) => obligation.within === group)
      .map((obligation) => obligation.name)
  )

const sweepKey = (memberKeys, entryPath, key, value) => {
  if (!memberKeys.has(key)) {
    return [{ key, path: entryPath }]
  }
  const member = obligationByName(key)
  return member && isGroup(member)
    ? sweepEntries(member, value, `${entryPath}.${key}`)
    : []
}

const sweepEntry = (memberKeys, path, entry, index) => {
  if (entry === null || typeof entry !== 'object') {
    return []
  }
  const entryPath = `${path}[${index}]`
  return Object.entries(entry).flatMap(([key, value]) =>
    sweepKey(memberKeys, entryPath, key, value)
  )
}

const sweepEntries = (group, items, path) => {
  if (!Array.isArray(items)) {
    return []
  }
  const memberKeys = memberKeysOf(group)
  return items.flatMap((entry, index) =>
    sweepEntry(memberKeys, path, entry, index)
  )
}

const unrecognisedKeysFor = (key, value) => {
  if (!topLevelKeys().has(key)) {
    return [{ key, path: '(top level)' }]
  }
  const obligation = obligationByName(key)
  return obligation && isGroup(obligation)
    ? sweepEntries(obligation, value, key)
    : []
}

/**
 * Every key in the answers tree that is not a manifest obligation name in
 * its declared position, a flow-only key, or a system key. Values below leaf
 * keys (addresses, date parts, arrays) are opaque and not swept.
 *
 * @param {object} answers - the nested answer POJO.
 * @returns {Array<{ key: string, path: string }>} empty when fully recognised.
 */
export const unrecognisedAnswerKeys = (answers) => {
  if (answers === null || typeof answers !== 'object') {
    return []
  }
  return Object.entries(answers).flatMap(([key, value]) =>
    unrecognisedKeysFor(key, value)
  )
}

/**
 * Throw when the answers tree carries any unrecognised key — an inert key
 * would otherwise persist silently and ship at finalise.
 *
 * @param {object} answers - the nested answer POJO to check.
 * @param {string} context - the call-site label folded into the thrown error message.
 */
export const assertRecognisedAnswerKeys = (answers, context) => {
  const problems = unrecognisedAnswerKeys(answers)
  if (problems.length === 0) {
    return
  }
  const detail = problems
    .map(({ key, path }) => `"${key}" at ${path}`)
    .join(', ')
  throw new Error(
    `Unrecognised answer key(s) ${detail} (${context}). Every stored key ` +
      'must be a manifest obligation name, a flow-only key or a system key — ' +
      'see bridge/obligation-source.js.'
  )
}
