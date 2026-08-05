// Test scaffold from docs/add-a-set.md step 7.
import { describe, expect, it } from 'vitest'

import { obligationMetadata } from '../../../model/obligations/helpers/index.js'
import { obligations, policy } from './index.js'

const MAX_WITHIN_CHAIN_DEPTH = 100
const PATH_SAFE_NAME = /^[A-Za-z][A-Za-z0-9]*$/
const KNOWN_UNWIRED = []

const duplicatesOf = (items, keyFn) => {
  const counts = new Map()
  for (const item of items) {
    const key = keyFn(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => `${key} (×${count})`)
}

const withinChainProblem = (obligation) => {
  const seen = new Set()
  let current = obligation.within
  let depth = 0
  while (current) {
    if (seen.has(current.id)) {
      return `${obligation.name} → cycle at ${current.name}`
    }
    seen.add(current.id)
    current = current.within
    depth += 1
    if (depth > MAX_WITHIN_CHAIN_DEPTH) {
      return `${obligation.name} → chain exceeds safe depth`
    }
  }
  return null
}

describe('plant-products obligation structural integrity', () => {
  it('terminates every within-chain', () => {
    const problems = obligations
      .map((obligation) => withinChainProblem(obligation))
      .filter((problem) => problem !== null)

    expect(problems).toEqual([])
  })

  it('uses unique ids and path-safe unique names', () => {
    expect(duplicatesOf(obligations, ({ id }) => id)).toEqual([])
    expect(duplicatesOf(obligations, ({ name }) => name)).toEqual([])
    expect(
      obligations
        .filter(({ name }) => !PATH_SAFE_NAME.test(name))
        .map(({ name }) => name)
    ).toEqual([])
  })

  it('resolves every gated obligation dependency to a manifest id', () => {
    const ids = new Set(obligations.map(({ id }) => id))
    const problems = obligations.flatMap((obligation) => {
      if (typeof obligation.applyTo !== 'function') {
        return []
      }
      const dependsOn = obligationMetadata(obligation).dependsOn
      if (!Array.isArray(dependsOn)) {
        return [`${obligation.name}: missing`]
      }
      return dependsOn
        .filter((id) => !ids.has(id))
        .map((id) => `${obligation.name}: ${id}`)
    })
    expect(problems).toEqual([])
  })

  it('keeps the declared-but-unwired allowlist explicit and empty at m0', () => {
    expect(KNOWN_UNWIRED).toEqual([])
    expect(policy.systemPopulated).toEqual(KNOWN_UNWIRED)
  })
})
