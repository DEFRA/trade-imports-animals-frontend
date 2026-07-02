import { describe, it, expect } from 'vitest'
import { createScopeRegistry } from './registry.js'

describe('engine/scope/registry — mechanics', () => {
  it('registers named rules and returns them in registration order', () => {
    const registry = createScopeRegistry()
    const first = () => ({ status: 'mandatory' })
    const second = () => null
    registry.register('excessAmount', 'firstRule', first)
    registry.register('excessAmount', 'secondRule', second)
    expect(registry.rulesFor('excessAmount')).toEqual([
      { ruleName: 'firstRule', when: first },
      { ruleName: 'secondRule', when: second }
    ])
  })

  it('returns [] for obligations with no rules (the always-applicable default)', () => {
    const registry = createScopeRegistry()
    expect(registry.rulesFor('premium')).toEqual([])
    expect(registry.has('premium')).toBe(false)
  })

  it('lists the obligation names rules target', () => {
    const registry = createScopeRegistry()
    registry.register('a', 'ruleA', () => null)
    registry.register('b', 'ruleB', () => null)
    expect(registry.obligationNames()).toEqual(['a', 'b'])
    expect(registry.has('a')).toBe(true)
  })

  it('rejects duplicate rule names on one obligation', () => {
    const registry = createScopeRegistry()
    registry.register('a', 'ruleA', () => null)
    expect(() => registry.register('a', 'ruleA', () => null)).toThrow(
      'Scope rule "ruleA" already registered for "a"'
    )
  })

  it('rejects non-function rules', () => {
    const registry = createScopeRegistry()
    expect(() => registry.register('a', 'ruleA', 'not-a-function')).toThrow(
      'Scope rule "ruleA" must be a function'
    )
  })

  it('asserts model coverage: registered names must exist', () => {
    const registry = createScopeRegistry()
    registry.register('email', 'alwaysRequired', () => null)
    registry.register('ghost', 'alwaysRequired', () => null)
    expect(() => registry.assertCoverage(['email', 'fullName'])).toThrow(
      'Scope rules target unknown obligation "ghost"'
    )
    expect(() =>
      registry.assertCoverage(['email', 'fullName', 'ghost'])
    ).not.toThrow()
  })
})
