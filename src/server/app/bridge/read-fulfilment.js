import {
  INDEX_DELIMITER,
  compareIndexArrays,
  formatFulfilmentId,
  hasIndexedSegments,
  indicesOf,
  segmentsOf
} from './fulfilment-id.js'
import { fulfilmentRegistry } from './fulfilment-registry.js'
import { ancestorChain } from './fulfilments/index.js'

const ancestorsAndSelf = (obligation) => [
  ...ancestorChain(obligation),
  obligation
]

const compareFulfilmentIds = (left, right) =>
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

const instanceIdOf = (fulfilmentId, groupChain, descriptors, parentId) => {
  if (!hasIndexedSegments(fulfilmentId)) {
    return undefined
  }
  const segments = segmentsOf(fulfilmentId)
  if (segments.length < groupChain.length) {
    return undefined
  }
  const id = formatFulfilmentId(
    descriptors,
    indicesOf(fulfilmentId).slice(0, groupChain.length)
  )
  if (id !== segments.slice(0, groupChain.length).join(INDEX_DELIMITER)) {
    return undefined
  }
  if (
    parentId !== undefined &&
    !id.startsWith(`${parentId}${INDEX_DELIMITER}`)
  ) {
    return undefined
  }
  return id
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
  // Truncating each exact composite-id prefix to the requested group depth
  // means a unit-only record still establishes its containing commodity line.
  const instanceIds = (group, descendants, parentId) => {
    const groupChain = ancestorsAndSelf(group)
    const descriptors = groupChain.map(({ id }) =>
      registry.groupDescriptorOf(id)
    )
    if (descriptors.includes(undefined)) {
      throw new TypeError(`Cannot enumerate unbound group ${group.name}`)
    }

    const ids = new Set()
    for (const obligation of descendants) {
      assertDescendant(group, obligation)
      for (const fulfilmentId of Object.keys(records(obligation))) {
        const id = instanceIdOf(fulfilmentId, groupChain, descriptors, parentId)
        if (id !== undefined) {
          ids.add(id)
        }
      }
    }
    return [...ids].sort(compareFulfilmentIds)
  }

  return { scalar, records, instanceIds }
}
