/**
 * Bridge — model `fulfilments` -> page `answers`.
 *
 * A pure, storage-agnostic projection between the two shapes:
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
 * An obligation's `name` is its answers key, its `id` is its fulfilments UUID,
 * and its `within` chain gives its depth. Group obligations
 * (`commodityLines`, `animalIdentifiers`) carry no value of their own —
 * their instances are inferred from descendant records — so the bridge
 * rebuilds the answer arrays from the leaves.
 *
 * Forward input assembly is feature-owned in `features/<feature>/evaluation.js` and
 * coordinated by `assemble-fulfilments.js`.
 */

import { obligations } from '../model/obligations/obligations.js'
import { setAt } from '../lib/path.js'
import { hasIndexedSegments, indicesOf, segmentsOf } from './fulfilment-id.js'

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

// ---------------------------------------------------------------------------
// fulfilments -> answers
// ---------------------------------------------------------------------------

const failProjection = (message) => {
  throw new TypeError(`Invalid answers projection: ${message}`)
}

const validateFulfilmentId = (chain, fulfilmentId, name) => {
  if (!hasIndexedSegments(fulfilmentId)) {
    failProjection(
      `fulfilmentId "${String(
        fulfilmentId
      )}" for ${name} must have a trailing numeric index on every segment`
    )
  }

  const actualDepth = segmentsOf(fulfilmentId).length
  if (actualDepth !== chain.length) {
    failProjection(
      `fulfilmentId "${fulfilmentId}" for ${name} has depth ${actualDepth}; ` +
        `the within chain requires depth ${chain.length}`
    )
  }

  return indicesOf(fulfilmentId)
}

export const fulfilmentIdToPath = (chain, fulfilmentId, name) => {
  const indices = validateFulfilmentId(chain, fulfilmentId, name)
  const path = []
  chain.forEach((group, depth) => {
    path.push(group.name, indices[depth])
  })
  path.push(name)
  return path
}

const answersWithScalar = (answers, name, stored) =>
  setAt(answers, [name], stored)

const compareIndices = (left, right) => {
  const sharedDepth = Math.min(left.indices.length, right.indices.length)
  for (let depth = 0; depth < sharedDepth; depth++) {
    if (left.indices[depth] !== right.indices[depth]) {
      return left.indices[depth] - right.indices[depth]
    }
  }
  return left.indices.length - right.indices.length
}

const answersWithRecords = (answers, chain, name, records) =>
  records.reduce(
    (acc, [fulfilmentId, value]) =>
      setAt(acc, fulfilmentIdToPath(chain, fulfilmentId, name), value),
    answers
  )

const recordProjectionOf = (obligation, stored) => {
  const chain = ancestorChain(obligation)
  return {
    obligation,
    chain,
    records: Object.entries(stored)
      .map(([fulfilmentId, value]) => ({
        fulfilmentId,
        indices: validateFulfilmentId(chain, fulfilmentId, obligation.name),
        value
      }))
      .sort(compareIndices)
  }
}

const addCollectionIndices = (collectionIndices, projection) => {
  for (const { indices } of projection.records) {
    projection.chain.forEach((group, depth) => {
      const byParent = collectionIndices.get(group) ?? new Map()
      collectionIndices.set(group, byParent)
      const parent = indices.slice(0, depth).join('/')
      const present = byParent.get(parent) ?? new Set()
      byParent.set(parent, present)
      present.add(indices[depth])
    })
  }
}

const validateDenseIndices = (collectionIndices) => {
  for (const [group, byParent] of collectionIndices) {
    for (const [parent, present] of byParent) {
      const indices = [...present].sort((left, right) => left - right)
      const gap = indices.findIndex((index, position) => index !== position)
      if (gap !== -1) {
        const location = parent ? ` below ${parent}` : ''
        failProjection(
          `${group.name}${location} has sparse indices ` +
            `[${indices.join(', ')}]; expected consecutive indices from 0`
        )
      }
    }
  }
}

const projectionsOf = (fulfilments) => {
  const projections = new Map()
  const collectionIndices = new Map()

  for (const obligation of obligations) {
    if (groupObligations.has(obligation)) continue
    const stored = fulfilments?.[obligation.id]
    if (stored === undefined || !obligation.within) continue
    const projection = recordProjectionOf(obligation, stored)
    projections.set(obligation, projection)
    addCollectionIndices(collectionIndices, projection)
  }

  validateDenseIndices(collectionIndices)
  return projections
}

const withObligationAnswer = (
  answers,
  fulfilments,
  projections,
  obligation
) => {
  if (groupObligations.has(obligation)) return answers
  const stored = fulfilments?.[obligation.id]
  if (stored === undefined) return answers
  if (!obligation.within) {
    return answersWithScalar(answers, obligation.name, stored)
  }
  const { chain, records } = projections.get(obligation)
  return answersWithRecords(
    answers,
    chain,
    obligation.name,
    records.map(({ fulfilmentId, value }) => [fulfilmentId, value])
  )
}

/**
 * Project the model `fulfilments` into the request-local page `answers`.
 *
 * The request-local page projection of canonical fulfilments. The animal
 * count comes back as the number the model stores, not the page's original
 * string.
 *
 * @param {object} [fulfilments={}] - the flat, UUID-keyed fulfilments map.
 * @returns {object} the nested answer POJO.
 */
export const projectAnswers = (fulfilments = {}) => {
  const projections = projectionsOf(fulfilments)
  return obligations.reduce(
    (answers, obligation) =>
      withObligationAnswer(answers, fulfilments, projections, obligation),
    {}
  )
}
