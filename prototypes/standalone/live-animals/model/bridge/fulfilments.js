/**
 * Bridge — A's `answers` <-> B's `fulfilments`.
 *
 * A pure, storage-agnostic translation between the two shapes the retrofit
 * has to reconcile (PLAN §2.3, §3):
 *
 *   A `answers`     nested POJO keyed by A's obligation id. Collections are
 *                   positional arrays in `lib/path.js`'s `a.b[0].c` grammar:
 *                   `answers.commodityLines[0].animalIdentifiers[1].animalIdentifierPassport`.
 *
 *   B `fulfilments` flat map keyed by the obligation UUID (`obligation.id`,
 *                   NOT `name` — verified against `evaluator.js`'s
 *                   `dropUnknownFulfilments`/`buildObligationsById`). Grouped
 *                   values are records-maps `{ fulfilmentId: value }` whose
 *                   fulfilmentId is a `/`-delimited composite of one segment
 *                   per enclosing group (`line0` at depth 1, `line0/unit1` at
 *                   depth 2). Top-level scalars store the value directly.
 *
 * The structure is derived from the vendored manifest, not restated here: an
 * obligation's `name` is its A id (inc-007), its `id` is its B UUID, and its
 * `within` chain gives its depth. Group obligations (`commodityLines`,
 * `animalIdentifiers`) carry no value of their own — their instances are
 * inferred from descendant records — so the bridge never emits a fulfilment
 * for them and rebuilds A's arrays from the leaves.
 *
 * Vocabulary is normalised A->B at the boundary (PLAN §3 "Vocabulary"):
 * A stores A-vocab (MDM options), B's gates compare B-vocab. The commodity
 * case is the one non-injective transform — `Cat`/`Dog` both map to
 * `01061900` — so B->A recovers only a representative name. See
 * `DESIGN-DELTA.md` §7.
 */

import { obligations } from '../obligations/obligations.js'
import {
  commodityCodeFor,
  commodityNameFor
} from '../../services/commodities/index.js'
import { setAt } from '../../lib/path.js'

// The nested collection groups, outermost first. The prefix is cosmetic
// and reversible — B treats a fulfilmentId as opaque; only the trailing
// integer carries the positional index. A group whose depth exceeds this
// list falls back to `grp<depth>`. `documents` is a depth-0 collection and
// so shares the `line` token with `commodityLines`; the tokens never
// collide because each obligation owns a separate record map.
const GROUP_SEGMENT_PREFIXES = ['line', 'unit']

// ---------------------------------------------------------------------------
// Manifest-derived lookups — computed once from the vendored obligations.
// ---------------------------------------------------------------------------

const byAId = new Map(obligations.map((o) => [o.name, o]))

export const groupObligations = new Set(
  obligations.filter((o) => obligations.some((other) => other.within === o))
)

// Ancestor groups from root down to immediate parent (excluding self).
export const ancestorChain = (obligation) => {
  const chain = []
  let cur = obligation.within
  while (cur) {
    chain.unshift(cur)
    cur = cur.within
  }
  return chain
}

const segmentToken = (group) =>
  GROUP_SEGMENT_PREFIXES[ancestorChain(group).length] ??
  `grp${ancestorChain(group).length}`

// ---------------------------------------------------------------------------
// Vocabulary normalisation — per-field, A<->B. Fields absent here pass
// through unchanged. Only string scalars are transformed; addresses, dates
// and arrays are opaque composite values.
// ---------------------------------------------------------------------------

const camelToKebab = (s) =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const kebabToCamel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())

const titleToKebab = (s) => s.toLowerCase().replace(/\s+/g, '-')

const kebabToTitle = (s) =>
  s
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const stripGbPrefix = (s) => (s.startsWith('GB ') ? s.slice(3) : s)

const addGbPrefix = (s) => (s.startsWith('GB') ? s : `GB ${s}`)

const VOCAB = {
  // A stores the display name (`Cow`); B's gates compare the CN code (`0102`).
  // `COMMODITY_CODES` is NON-INJECTIVE — `Cat`/`Dog` -> `01061900` — so `toA`
  // is lossy and recovers a representative name only (DESIGN-DELTA §7).
  commoditySelection: { toB: commodityCodeFor, toA: commodityNameFor },
  reasonForImport: { toB: camelToKebab, toA: kebabToCamel },
  transporterType: { toB: titleToKebab, toA: kebabToTitle },
  meansOfTransport: { toB: titleToKebab, toA: kebabToTitle },
  portOfEntry: { toB: stripGbPrefix, toA: addGbPrefix }
}

const normalise = (direction, aId, value) => {
  const converter = VOCAB[aId]?.[direction]
  if (!converter || typeof value !== 'string') return value
  const converted = converter(value)
  // A converter that cannot place a value (unknown commodity name/code) must
  // not destroy it — pass the original through rather than emit `undefined`.
  return converted === undefined ? value : converted
}

const normaliseToB = (aId, value) => normalise('toB', aId, value)
const normaliseToA = (aId, value) => normalise('toA', aId, value)

// ---------------------------------------------------------------------------
// A -> B
// ---------------------------------------------------------------------------

// Walk A's nested arrays for one leaf obligation, emitting one
// `[compositeFulfilmentId, value]` per answered instance.
const collectGroupedRecords = (answers, chain, aId) => {
  const records = {}
  const walk = (node, remainingGroups, segments) => {
    if (remainingGroups.length === 0) {
      const value = node?.[aId]
      if (value !== undefined) {
        records[segments.join('/')] = normaliseToB(aId, value)
      }
      return
    }
    const [group, ...rest] = remainingGroups
    const items = node?.[group.name]
    if (!Array.isArray(items)) return
    const token = segmentToken(group)
    items.forEach((item, index) => {
      walk(item, rest, [...segments, `${token}${index}`])
    })
  }
  walk(answers, chain, [])
  return records
}

/**
 * Translate A's `answers` into B's `fulfilments`.
 *
 * @param {object} answers - A's nested answer POJO.
 * @returns {object} B's flat, UUID-keyed fulfilments map.
 */
export const answersToFulfilments = (answers = {}) => {
  const fulfilments = {}
  for (const obligation of obligations) {
    const aId = obligation.name
    if (groupObligations.has(obligation)) continue
    const chain = ancestorChain(obligation)
    if (chain.length === 0) {
      const value = answers?.[aId]
      if (value !== undefined) {
        fulfilments[obligation.id] = normaliseToB(aId, value)
      }
    } else {
      const records = collectGroupedRecords(answers, chain, aId)
      if (Object.keys(records).length > 0) {
        fulfilments[obligation.id] = records
      }
    }
  }
  return fulfilments
}

// ---------------------------------------------------------------------------
// B -> A
// ---------------------------------------------------------------------------

// Positional index carried by one composite segment (`line0` -> 0). The
// inverse is defined over bridge-convention fulfilmentIds; opaque
// orchestrator ULIDs carry no positional index and are out of scope for B->A.
const indexOfSegment = (segment) => Number(segment.match(/\d+$/)?.[0])

export const fulfilmentIdToPath = (chain, fulfilmentId, aId) => {
  const segments = fulfilmentId.split('/')
  const path = []
  chain.forEach((group, depth) => {
    path.push(group.name, indexOfSegment(segments[depth]))
  })
  path.push(aId)
  return path
}

// The composite fulfilmentId of a whole collection INSTANCE, from its A
// positional path. The instance-level counterpart of `fulfilmentIdToPath`
// (which addresses a single leaf): given an A collection path in the
// `a.b[0].c` grammar (e.g. `['commodityLines', 0, 'animalIdentifiers']`) and
// a positional index, emit B's group fulfilmentId prefix (`line0/unit<index>`).
// Reuses `segmentToken` + `ancestorChain`, so a third collection level needs
// no change here. Instance identity is positional under both flags.
export const instanceFulfilmentId = (collectionPath, index) => {
  const names = collectionPath.filter((segment) => typeof segment === 'string')
  const group = byAId.get(names[names.length - 1])
  const chain = [...ancestorChain(group), group]
  const indices = [
    ...collectionPath.filter((segment) => typeof segment === 'number'),
    index
  ]
  return chain
    .map((groupNode, depth) => `${segmentToken(groupNode)}${indices[depth]}`)
    .join('/')
}

/**
 * Translate B's `fulfilments` back into A's `answers`.
 *
 * The inverse of {@link answersToFulfilments} over bridge-convention
 * fulfilmentIds. Non-injective commodity codes recover a representative name
 * only (DESIGN-DELTA §7).
 *
 * @param {object} fulfilments - B's flat, UUID-keyed fulfilments map.
 * @returns {object} A's nested answer POJO.
 */
export const fulfilmentsToAnswers = (fulfilments = {}) => {
  let answers = {}
  for (const obligation of obligations) {
    const aId = obligation.name
    if (groupObligations.has(obligation)) continue
    const stored = fulfilments?.[obligation.id]
    if (stored === undefined) continue
    const chain = ancestorChain(obligation)
    if (chain.length === 0) {
      answers = setAt(answers, [aId], normaliseToA(aId, stored))
    } else {
      for (const [fulfilmentId, value] of Object.entries(stored)) {
        const path = fulfilmentIdToPath(chain, fulfilmentId, aId)
        answers = setAt(answers, path, normaliseToA(aId, value))
      }
    }
  }
  return answers
}
