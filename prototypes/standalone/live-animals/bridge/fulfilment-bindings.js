import { formatFulfilmentId } from './fulfilment-id.js'

const identity = (value) => value

export const scalar = ({ field, obligation, convert = identity }) =>
  Object.freeze({
    kind: 'scalar',
    field,
    obligation,
    convert
  })

export const grouped = ({ field, obligation, groups, convert = identity }) =>
  Object.freeze({
    kind: 'grouped',
    field,
    obligation,
    groups: Object.freeze(groups.map((group) => Object.freeze({ ...group }))),
    convert
  })

export const feature = (name, bindings) =>
  Object.freeze({
    name,
    bindings: Object.freeze([...bindings])
  })

const addScalar = (contribution, binding, answers) => {
  const value = answers?.[binding.field]
  if (value !== undefined) {
    contribution[binding.obligation.id] = binding.convert(value)
  }
}

const nodeFor = (children, group) => {
  const key = `${group.obligation.id}:${group.field}:${group.token}`
  if (!children.has(key)) {
    children.set(key, {
      group,
      leaves: [],
      children: new Map()
    })
  }
  return children.get(key)
}

const groupedTree = (bindings) => {
  const root = { children: new Map() }
  for (const binding of bindings) {
    let children = root.children
    let node
    for (const group of binding.groups) {
      node = nodeFor(children, group)
      children = node.children
    }
    node.leaves.push(binding)
  }
  return root
}

const addGroupedValue = (contribution, binding, fulfilmentId, source) => {
  const value = source?.[binding.field]
  if (value === undefined) return
  const records = contribution[binding.obligation.id] ?? {}
  records[fulfilmentId] = binding.convert(value)
  contribution[binding.obligation.id] = records
}

const walkGroup = (contribution, node, source, parentGroups, parentIndices) => {
  const items = source?.[node.group.field]
  if (!Array.isArray(items)) return
  const groups = [...parentGroups, node.group]
  items.forEach((item, index) => {
    const indices = [...parentIndices, index]
    const fulfilmentId = formatFulfilmentId(groups, indices)
    for (const binding of node.leaves) {
      addGroupedValue(contribution, binding, fulfilmentId, item)
    }
    for (const child of node.children.values()) {
      walkGroup(contribution, child, item, groups, indices)
    }
  })
}

export const assembleFeature = ({ bindings }, answers = {}) => {
  const contribution = {}
  const groupedBindings = []
  for (const binding of bindings) {
    if (binding.kind === 'scalar') {
      addScalar(contribution, binding, answers)
    } else {
      groupedBindings.push(binding)
    }
  }
  const tree = groupedTree(groupedBindings)
  for (const node of tree.children.values()) {
    walkGroup(contribution, node, answers, [], [])
  }
  return contribution
}
