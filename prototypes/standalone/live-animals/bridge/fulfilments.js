/**
 * Bridge — page `answers` <-> model `fulfilments`.
 *
 * A pure, storage-agnostic translation between the two shapes:
 *
 *   `answers`     nested POJO keyed by obligation name. Collections are
 *                 positional arrays in `lib/path.js`'s `a.b[0].c` grammar:
 *                 `answers.commodityLines[0].animalIdentifiers[1].animalIdentifierPassport`.
 *
 *   `fulfilments` flat map keyed by the obligation UUID (`obligation.id`,
 *                 NOT `name` — verified against `evaluator.js`'s
 *                 `dropUnknownFulfilments`/`buildObligationsById`). Grouped
 *                 values are records-maps `{ fulfilmentId: value }` whose
 *                 fulfilmentId is a `/`-delimited composite of one segment
 *                 per enclosing group (`line0` at depth 1, `line0/unit1` at
 *                 depth 2). Top-level scalars store the value directly.
 *
 * The structure is derived from the vendored manifest, not restated here: an
 * obligation's `name` is its answers key, its `id` is its fulfilments UUID,
 * and its `within` chain gives its depth. Group obligations
 * (`commodityLines`, `animalIdentifiers`) carry no value of their own —
 * their instances are inferred from descendant records — so the bridge never
 * emits a fulfilment for them and rebuilds the answer arrays from the leaves.
 *
 * Values pass through unchanged — answers and the manifest's gates share the
 * stored vocabulary. The one exception is the animal count, coerced from the
 * page's HTTP string to the number `recordCountEquals` compares.
 */

import {
  numberOfAnimals,
  obligations
} from '../model/obligations/obligations.js'
import { setAt } from '../lib/path.js'

// The nested collection groups, outermost first. The prefix is cosmetic
// and reversible — the evaluator treats a fulfilmentId as opaque; only the
// trailing integer carries the positional index. A group whose depth exceeds this
// list falls back to `grp<depth>`. `documents` is a depth-0 collection and
// so shares the `line` token with `commodityLines`; the tokens never
// collide because each obligation owns a separate record map.
const GROUP_SEGMENT_PREFIXES = ['line', 'unit']

// ---------------------------------------------------------------------------
// Manifest-derived lookups — computed once from the vendored obligations.
// ---------------------------------------------------------------------------

const byAId = new Map(
  obligations.map((obligation) => [obligation.name, obligation])
)

export const groupObligations = new Set(
  obligations.filter((obligation) =>
    obligations.some((other) => other.within === obligation)
  )
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

// The pages store form payloads as strings; the model's
// `recordCountEquals` invariant compares the stored count against a
// record tally with strict equality, so the count must reach the
// evaluator as a NUMBER. Unparseable input passes through raw —
// validation is controller-side.
const toNumberWhenParses = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return value
  const n = Number(value)
  return Number.isFinite(n) ? n : value
}

const modelValue = (aId, value) =>
  aId === numberOfAnimals.name ? toNumberWhenParses(value) : value

// ---------------------------------------------------------------------------
// answers -> fulfilments
// ---------------------------------------------------------------------------

// Walk the nested answer arrays for one leaf obligation, emitting one
// `[compositeFulfilmentId, value]` per answered instance.
const collectGroupedRecords = (answers, chain, aId) => {
  const records = {}
  const walk = (node, remainingGroups, segments) => {
    if (remainingGroups.length === 0) {
      const value = node?.[aId]
      if (value !== undefined) {
        records[segments.join('/')] = modelValue(aId, value)
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

const scalarFulfilment = (answers, aId) => {
  const value = answers?.[aId]
  return value === undefined ? undefined : modelValue(aId, value)
}

const groupFulfilment = (answers, chain, aId) => {
  const records = collectGroupedRecords(answers, chain, aId)
  return Object.keys(records).length > 0 ? records : undefined
}

const fulfilmentFor = (answers, obligation) => {
  const aId = obligation.name
  const chain = ancestorChain(obligation)
  return chain.length === 0
    ? scalarFulfilment(answers, aId)
    : groupFulfilment(answers, chain, aId)
}

/**
 * Translate the page `answers` into the model `fulfilments`.
 *
 * @param {object} [answers={}] - the nested answer POJO.
 * @returns {object} the flat, UUID-keyed fulfilments map.
 */
export const answersToFulfilments = (answers = {}) => {
  const fulfilments = {}
  for (const obligation of obligations) {
    if (groupObligations.has(obligation)) continue
    const value = fulfilmentFor(answers, obligation)
    if (value !== undefined) {
      fulfilments[obligation.id] = value
    }
  }
  return fulfilments
}

// ---------------------------------------------------------------------------
// fulfilments -> answers
// ---------------------------------------------------------------------------

// Positional index carried by one composite segment (`line0` -> 0). The
// inverse is defined over bridge-convention fulfilmentIds; opaque
// orchestrator ULIDs carry no positional index and are out of scope for
// the reverse direction.
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

// The composite fulfilmentId of a whole collection INSTANCE, from its
// positional answer path. The instance-level counterpart of
// `fulfilmentIdToPath` (which addresses a single leaf): given a collection
// path in the `a.b[0].c` grammar (e.g. `['commodityLines', 0,
// 'animalIdentifiers']`) and a positional index, emit the group fulfilmentId
// prefix (`line0/unit<index>`). Reuses `segmentToken` + `ancestorChain`, so
// a third collection level needs no change here.
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

const answersWithScalar = (answers, aId, stored) =>
  setAt(answers, [aId], stored)

const answersWithRecords = (answers, chain, aId, stored) =>
  Object.entries(stored).reduce(
    (acc, [fulfilmentId, value]) =>
      setAt(acc, fulfilmentIdToPath(chain, fulfilmentId, aId), value),
    answers
  )

const withObligationAnswer = (answers, fulfilments, obligation) => {
  if (groupObligations.has(obligation)) return answers
  const aId = obligation.name
  const stored = fulfilments?.[obligation.id]
  if (stored === undefined) return answers
  const chain = ancestorChain(obligation)
  return chain.length === 0
    ? answersWithScalar(answers, aId, stored)
    : answersWithRecords(answers, chain, aId, stored)
}

/**
 * Translate the model `fulfilments` back into the page `answers`.
 *
 * The inverse of {@link answersToFulfilments} over bridge-convention
 * fulfilmentIds. The animal count comes back as the number the model stores,
 * not the page's original string.
 *
 * @param {object} [fulfilments={}] - the flat, UUID-keyed fulfilments map.
 * @returns {object} the nested answer POJO.
 */
export const fulfilmentsToAnswers = (fulfilments = {}) =>
  obligations.reduce(
    (answers, obligation) =>
      withObligationAnswer(answers, fulfilments, obligation),
    {}
  )
