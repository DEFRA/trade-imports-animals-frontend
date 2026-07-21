import { obligations } from '../model/obligations/obligations.js'

const templatePathOf = (obligation) => {
  const names = []
  let current = obligation
  while (current) {
    names.unshift(current.name)
    current = current.within
  }
  return names.join('.')
}

export function* walkObligations() {
  for (const obligation of obligations) {
    yield { templatePath: templatePathOf(obligation), obligation }
  }
}

const byNameMap = new Map(obligations.map((o) => [o.name, o]))

export const obligationByName = (name) => byNameMap.get(name)

// Resolve an obligation by its dotted name-path — the `within` chain of names,
// root to leaf, joined by `.` (`commodityLines`,
// `commodityLines.animalIdentifiers`).
const byPathMap = new Map(obligations.map((o) => [templatePathOf(o), o]))

export const obligationByPath = (templatePath) => byPathMap.get(templatePath)

export const SYSTEM_POPULATED = new Set([
  'poApprovedReferenceNumber',
  'responsiblePersonForLoad',
  'commodityType'
])

export const ENFORCED_AT_CONTINUE = new Set([
  'countryOfOrigin',
  'commoditySelection'
])

// Collection admission-control cap: a collection's entry count is
// capped at the value of a sibling count field in the frame that holds it.
// Enforcement lives on the write path (engine/evaluate/cardinality.js
// `collectionCapAt`, appendEntryAt rejects at the cap); only
// the declaration lives here. Keyed by collection name → sibling count field.
export const MAX_ENTRIES_FROM = {
  animalIdentifiers: 'numberOfAnimalsQuantity'
}

// ---------------------------------------------------------------------------
// Answer-key recognition — the single source of truth for which keys may
// appear in a stored answers tree. A key outside this surface is inert to
// the evaluator (never in scope, never wiped) yet ships raw at finalise, so
// the engine's write paths and submitJourney reject it loudly instead.
// ---------------------------------------------------------------------------

// Flow-owned obligations the notification model does not carry: the
// pre-journey import-type filter and the submit-time declaration step.
export const FLOW_ONLY_OBLIGATIONS = ['importType', 'declaration']

// Keys the system itself writes into answers outside the manifest: the
// backend-assigned notification reference restored on real-mode resume
// (services/persistence/records/notification-mapper.js).
export const SYSTEM_ANSWER_KEYS = new Set(['referenceNumber'])

// Feature-owned auxiliary keys stored inside a collection entry alongside
// its obligation fields, keyed by collection name. The documents feature
// stores its upload handle and original filename on each record.
export const AUX_ENTRY_KEYS = {
  documents: new Set(['uploadId', 'filename'])
}

const groupSet = new Set(
  obligations.filter((o) => obligations.some((other) => other.within === o))
)

const topLevelKeys = new Set([
  ...obligations.filter((o) => !o.within).map((o) => o.name),
  ...FLOW_ONLY_OBLIGATIONS,
  ...SYSTEM_ANSWER_KEYS
])

const memberKeysOf = (group) =>
  new Set([
    ...obligations.filter((o) => o.within === group).map((o) => o.name),
    ...(AUX_ENTRY_KEYS[group.name] ?? [])
  ])

const sweepEntries = (group, items, path, problems) => {
  if (!Array.isArray(items)) return
  const memberKeys = memberKeysOf(group)
  items.forEach((entry, index) => {
    if (entry === null || typeof entry !== 'object') return
    for (const [key, value] of Object.entries(entry)) {
      const entryPath = `${path}[${index}]`
      if (!memberKeys.has(key)) {
        problems.push({ key, path: entryPath })
        continue
      }
      const member = byNameMap.get(key)
      if (member && groupSet.has(member)) {
        sweepEntries(member, value, `${entryPath}.${key}`, problems)
      }
    }
  })
}

/**
 * Every key in the answers tree that is not a manifest obligation name in
 * its declared position, a flow-only key, a system key, or a declared
 * auxiliary entry key. Values below leaf keys (addresses, date parts,
 * arrays) are opaque and not swept.
 *
 * @param {object} answers - the nested answer POJO.
 * @returns {Array<{ key: string, path: string }>} empty when fully recognised.
 */
export const unrecognisedAnswerKeys = (answers) => {
  const problems = []
  if (answers === null || typeof answers !== 'object') return problems
  for (const [key, value] of Object.entries(answers)) {
    if (!topLevelKeys.has(key)) {
      problems.push({ key, path: '(top level)' })
      continue
    }
    const obligation = byNameMap.get(key)
    if (obligation && groupSet.has(obligation)) {
      sweepEntries(obligation, value, key, problems)
    }
  }
  return problems
}

/** Throw when the answers tree carries any unrecognised key — an inert key
 *  would otherwise persist silently and ship at finalise. */
export const assertRecognisedAnswerKeys = (answers, context) => {
  const problems = unrecognisedAnswerKeys(answers)
  if (problems.length === 0) return
  const detail = problems
    .map(({ key, path }) => `"${key}" at ${path}`)
    .join(', ')
  throw new Error(
    `Unrecognised answer key(s) ${detail} (${context}). Every stored key ` +
      'must be a manifest obligation name, a flow-only key, a system key ' +
      'or a declared auxiliary entry key — see flow/obligation-source.js.'
  )
}
