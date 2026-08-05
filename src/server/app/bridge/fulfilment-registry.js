import { obligations } from '../model/obligations/manifest.js'
import { setKeyed } from '../shared/set-context.js'
import { ancestorChain } from './fulfilments/index.js'

const PATH_UNSAFE = /[.[\]/*]/
const TOKEN = /^[A-Za-z][A-Za-z-]*$/

const fail = (message) => {
  throw new Error(`Invalid fulfilment binding registry: ${message}`)
}

const assertField = (field, label) => {
  if (
    typeof field !== 'string' ||
    field.length === 0 ||
    PATH_UNSAFE.test(field)
  ) {
    fail(`${label} has invalid store field "${String(field)}"`)
  }
}

const groupedPathOf = (binding) =>
  binding.groups.map(({ field }) => `${field}[*]`).join('.')

const pathOf = (binding) =>
  binding.kind === 'scalar'
    ? binding.field
    : `${groupedPathOf(binding)}.${binding.field}`

const assertManifestObligation = (binding, manifestById) => {
  const obligation = binding?.obligation
  if (!obligation?.id || manifestById.get(obligation.id) !== obligation) {
    fail(
      `binding for "${binding?.field ?? '(unknown)'}" must import its obligation object from the manifest`
    )
  }
}

const assertScalarPath = (binding) => {
  if (binding.obligation.within) {
    fail(
      `scalar binding "${binding.field}" cannot own grouped obligation ${binding.obligation.name}`
    )
  }
}

const assertGroupedPath = (binding, groupSet, manifestById) => {
  if (!Array.isArray(binding.groups) || binding.groups.length === 0) {
    fail(`grouped binding "${binding.field}" must declare a collection path`)
  }
  const expected = ancestorChain(binding.obligation)
  if (expected.length !== binding.groups.length) {
    fail(
      `binding path "${pathOf(binding)}" has depth ${binding.groups.length}; ` +
        `${binding.obligation.name} requires depth ${expected.length}`
    )
  }
  binding.groups.forEach((group, depth) => {
    assertField(group.field, `binding path "${pathOf(binding)}"`)
    if (!TOKEN.test(group.token)) {
      fail(
        `binding path "${pathOf(binding)}" has invalid group token "${String(group.token)}"`
      )
    }
    if (
      !groupSet.has(group.obligation) ||
      manifestById.get(group.obligation?.id) !== group.obligation ||
      expected[depth] !== group.obligation
    ) {
      fail(
        `binding path "${pathOf(binding)}" does not match the manifest within chain`
      )
    }
  })
}

const assertBindingPath = (binding, groupSet, manifestById) => {
  assertField(binding.field, 'binding')
  if (binding.kind === 'scalar') {
    assertScalarPath(binding)
    return
  }
  if (binding.kind !== 'grouped') {
    fail(
      `binding "${binding.field}" has unknown kind "${String(binding.kind)}"`
    )
  }
  assertGroupedPath(binding, groupSet, manifestById)
}

const claimBinding = (owners, featureBinding, binding) => {
  const id = binding.obligation.id
  if (owners.has(id)) {
    fail(
      `obligation ${binding.obligation.name} (${id}) is owned by both ` +
        `"${owners.get(id).feature.name}" and "${featureBinding.name}"`
    )
  }
  owners.set(id, { feature: featureBinding, binding })
}

const assertFeature = (featureBinding, featureNames) => {
  if (!featureBinding?.name || !Array.isArray(featureBinding.bindings)) {
    fail('every feature must declare a name and bindings array')
  }
  if (featureNames.has(featureBinding.name)) {
    fail(`feature name "${featureBinding.name}" is registered twice`)
  }
  featureNames.add(featureBinding.name)
}

const assertGroupConsistency = (descriptors, binding) => {
  for (const group of binding.groups ?? []) {
    const existing = descriptors.get(group.obligation.id)
    if (
      existing &&
      (existing.field !== group.field || existing.token !== group.token)
    ) {
      fail(
        `group ${group.obligation.name} has conflicting path/token declarations`
      )
    }
    descriptors.set(group.obligation.id, group)
  }
}

export const createFulfilmentRegistry = (
  features,
  manifest = obligations()
) => {
  const manifestById = new Map(
    manifest.map((obligation) => [obligation.id, obligation])
  )
  const groupSet = new Set(
    manifest.filter((obligation) =>
      manifest.some((other) => other.within === obligation)
    )
  )
  const leaves = manifest.filter((obligation) => !groupSet.has(obligation))
  const owners = new Map()
  const featureNames = new Set()
  const groupDescriptors = new Map()

  for (const featureBinding of features) {
    assertFeature(featureBinding, featureNames)
    for (const binding of featureBinding.bindings) {
      assertManifestObligation(binding, manifestById)
      assertBindingPath(binding, groupSet, manifestById)
      assertGroupConsistency(groupDescriptors, binding)
      claimBinding(owners, featureBinding, binding)
    }
  }

  const missing = leaves.filter((obligation) => !owners.has(obligation.id))
  if (missing.length > 0) {
    fail(
      `obligations owned by no feature: ${missing
        .map((obligation) => obligation.name)
        .join(', ')}`
    )
  }

  return Object.freeze({
    features: Object.freeze([...features]),
    leaves: Object.freeze(leaves),
    ownerOf: (obligationId) => owners.get(obligationId),
    groupDescriptorOf: (obligationId) => groupDescriptors.get(obligationId)
  })
}

const store = setKeyed('fulfilment registry')

const currentRegistry = () => {
  const configured = store.current()
  if (!configured.registry) {
    configured.registry = createFulfilmentRegistry(configured.bindings)
  }
  return configured.registry
}

export const configureFulfilmentRegistry = (setId, bindings) => {
  store.configure(setId, { bindings })
}

export const fulfilmentRegistry = Object.freeze({
  get features() {
    return currentRegistry().features
  },
  get leaves() {
    return currentRegistry().leaves
  },
  ownerOf: (obligationId) => currentRegistry().ownerOf(obligationId),
  groupDescriptorOf: (obligationId) =>
    currentRegistry().groupDescriptorOf(obligationId)
})

export const assertFulfilmentBindingCoverage = () => currentRegistry()
