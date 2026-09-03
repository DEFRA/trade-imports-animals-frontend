import {
  INDEX_DELIMITER,
  compareIndexArrays,
  formatFulfilmentIndex,
  hasIndexedSegments,
  indicesOf,
  segmentsOf
} from './fulfilment-id.js'
import { fulfilmentRegistry } from './fulfilment-registry.js'
import { ancestorChain } from '../model/obligations/manifest-graph.js'

const ancestorsAndSelf = (obligation) => [
  ...ancestorChain(obligation),
  obligation
]

const compareFulfilmentIndexes = (left, right) =>
  compareIndexArrays(indicesOf(left), indicesOf(right))

const bindingFor = (registry, obligation, kind) => {
  const binding = registry.ownerOf(obligation?.id)?.binding
  if (binding?.obligation !== obligation || binding.kind !== kind) {
    throw new TypeError(
      `Cannot read ${obligation?.name ?? 'unknown obligation'} as ${kind}`
    )
  }
  return binding
}

const assertDescendant = (group, obligation) => {
  if (!ancestorsAndSelf(obligation).includes(group)) {
    throw new TypeError(
      `${obligation.name} is not a descendant of ${group.name}`
    )
  }
}

const deriveFulfilmentIndex = (
  fulfilmentIndex,
  groupChain,
  descriptors,
  parentFulfilmentIndex
) => {
  if (!hasIndexedSegments(fulfilmentIndex)) {
    return undefined
  }
  const segments = segmentsOf(fulfilmentIndex)
  if (segments.length < groupChain.length) {
    return undefined
  }
  const groupIndex = formatFulfilmentIndex(
    descriptors,
    indicesOf(fulfilmentIndex).slice(0, groupChain.length)
  )
  if (
    groupIndex !== segments.slice(0, groupChain.length).join(INDEX_DELIMITER)
  ) {
    return undefined
  }
  if (
    parentFulfilmentIndex !== undefined &&
    !groupIndex.startsWith(`${parentFulfilmentIndex}${INDEX_DELIMITER}`)
  ) {
    return undefined
  }
  return groupIndex
}

/**
 * Read a canonical UUID-keyed fulfilment map through feature-owned bindings.
 * Callers identify values with imported obligation objects; answer names are
 * never re-inferred here.
 */
export const readFulfilment = (
  fulfilment = {},
  registry = fulfilmentRegistry
) => {
  const scalar = (obligation) => {
    bindingFor(registry, obligation, 'scalar')
    return fulfilment[obligation.id]
  }

  const records = (obligation) => {
    bindingFor(registry, obligation, 'grouped')
    return fulfilment[obligation.id] ?? {}
  }

  // Infer collection instances from the union of descendant record maps.
  // Truncating each exact fulfilment-index prefix to the requested group
  // depth means a unit-only record still establishes its containing line.
  const groupFulfilmentIndexes = (
    group,
    descendants,
    parentFulfilmentIndex
  ) => {
    const groupChain = ancestorsAndSelf(group)
    const descriptors = groupChain.map(({ id }) =>
      registry.groupDescriptorOf(id)
    )
    if (descriptors.includes(undefined)) {
      throw new TypeError(`Cannot enumerate unbound group ${group.name}`)
    }

    const indexes = new Set()
    for (const obligation of descendants) {
      assertDescendant(group, obligation)
      for (const fulfilmentIndex of Object.keys(records(obligation))) {
        const id = deriveFulfilmentIndex(
          fulfilmentIndex,
          groupChain,
          descriptors,
          parentFulfilmentIndex
        )
        if (id !== undefined) {
          indexes.add(id)
        }
      }
    }
    return [...indexes].sort(compareFulfilmentIndexes)
  }

  return { scalar, records, groupFulfilmentIndexes }
}
