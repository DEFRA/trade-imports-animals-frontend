import { describe, it, expect } from 'vitest'
import {
  allowListed,
  matches,
  present,
  and,
  or,
  not,
  any,
  every
} from './gates.js'
import {
  resolveGatedBy,
  resolveGate,
  identityLevelOf,
  enumerateInstancePaths,
  projectMatches
} from './gate-resolver.js'

// ---------------------------------------------------------------------------
// Synthetic fixtures — small hand-crafted obligations covering every
// identity-level shape the resolver has to handle:
//
//   notif   → notification-level scalar
//   group   → top-level user-driven group (depth-1)
//   field   → field record inside group (depth-1)
//   subGroup → nested group inside group (depth-1 group carrying depth-2 leaves)
//   subField → field record inside subGroup (depth-2)
// ---------------------------------------------------------------------------

const notif = { id: 'notif-id', name: 'notif', status: 'mandatory' }
const group = { id: 'group-id', name: 'group' }
const field = {
  id: 'field-id',
  name: 'field',
  within: group,
  status: 'mandatory'
}
const subGroup = { id: 'subGroup-id', name: 'subGroup', within: group }
const subField = {
  id: 'subField-id',
  name: 'subField',
  within: subGroup,
  status: 'mandatory'
}

const obligationsById = new Map([
  [notif.id, notif],
  [group.id, group],
  [field.id, field],
  [subGroup.id, subGroup],
  [subField.id, subField]
])

// ---------------------------------------------------------------------------
// identityLevelOf
// ---------------------------------------------------------------------------

describe('identityLevelOf', () => {
  it('returns [] for a notification-level obligation with no within', () => {
    expect(identityLevelOf(notif)).toEqual([])
  })

  it('returns [group] for a top-level group', () => {
    // groups themselves have identity level of their ancestors; a
    // top-level group has none.
    expect(identityLevelOf(group)).toEqual([])
  })

  it('returns [group] for a field record inside the group', () => {
    expect(identityLevelOf(field)).toEqual([group])
  })

  it('returns [group] for a nested group inside the group', () => {
    expect(identityLevelOf(subGroup)).toEqual([group])
  })

  it('returns [group, subGroup] for a field record inside a nested group', () => {
    expect(identityLevelOf(subField)).toEqual([group, subGroup])
  })
})

// ---------------------------------------------------------------------------
// enumerateInstancePaths
// ---------------------------------------------------------------------------

describe('enumerateInstancePaths', () => {
  it('returns Set(["""]) for scalar level', () => {
    expect(enumerateInstancePaths([], {}, obligationsById)).toEqual(
      new Set([''])
    )
  })

  it('returns empty set at depth-1 when no storage exists', () => {
    expect(enumerateInstancePaths([group], {}, obligationsById)).toEqual(
      new Set()
    )
  })

  it('enumerates depth-1 paths from field storage keys', () => {
    const fulfilments = {
      [field.id]: { line1: 'a', line2: 'b', line3: 'c' }
    }
    expect(
      enumerateInstancePaths([group], fulfilments, obligationsById)
    ).toEqual(new Set(['line1', 'line2', 'line3']))
  })

  it('enumerates depth-1 paths from deeper storage keys (prefix)', () => {
    // subField storage is at depth-2; its prefixes yield depth-1 paths.
    const fulfilments = {
      [subField.id]: { 'line1/sub1': 'x', 'line2/sub1': 'y' }
    }
    expect(
      enumerateInstancePaths([group], fulfilments, obligationsById)
    ).toEqual(new Set(['line1', 'line2']))
  })

  it('unions paths across multiple storage sources', () => {
    const fulfilments = {
      [field.id]: { line1: 'a' },
      [subField.id]: { 'line2/sub1': 'x' }
    }
    expect(
      enumerateInstancePaths([group], fulfilments, obligationsById)
    ).toEqual(new Set(['line1', 'line2']))
  })

  it('enumerates depth-2 paths from subField storage', () => {
    const fulfilments = {
      [subField.id]: { 'line1/sub1': 'x', 'line1/sub2': 'y', 'line2/sub1': 'z' }
    }
    expect(
      enumerateInstancePaths([group, subGroup], fulfilments, obligationsById)
    ).toEqual(new Set(['line1/sub1', 'line1/sub2', 'line2/sub1']))
  })

  it('ignores obligations whose identity level is shallower than requested', () => {
    // field is at depth-1; requesting depth-2 should not use its keys.
    const fulfilments = {
      [field.id]: { line1: 'a' },
      [subField.id]: { 'line2/sub1': 'x' }
    }
    expect(
      enumerateInstancePaths([group, subGroup], fulfilments, obligationsById)
    ).toEqual(new Set(['line2/sub1']))
  })
})

// ---------------------------------------------------------------------------
// projectMatches
// ---------------------------------------------------------------------------

describe('projectMatches', () => {
  it('returns matches unchanged when levels are equal', () => {
    const matches = new Set(['line1', 'line2'])
    expect(projectMatches([group], [group], matches, {}, obligationsById)).toBe(
      matches
    )
  })

  it('expands from shallower to deeper by prefix matching', () => {
    const fulfilments = {
      [subField.id]: {
        'line1/sub1': 'x',
        'line1/sub2': 'y',
        'line2/sub1': 'z'
      }
    }
    const matches = new Set(['line1'])
    expect(
      projectMatches(
        [group],
        [group, subGroup],
        matches,
        fulfilments,
        obligationsById
      )
    ).toEqual(new Set(['line1/sub1', 'line1/sub2']))
  })

  it('expands returns empty when no deeper paths currently exist under matches', () => {
    const matches = new Set(['line1'])
    expect(
      projectMatches([group], [group, subGroup], matches, {}, obligationsById)
    ).toEqual(new Set())
  })

  it('expands from scalar to depth-1: broadcast to every current path', () => {
    const fulfilments = {
      [field.id]: { line1: 'a', line2: 'b' }
    }
    const matches = new Set([''])
    expect(
      projectMatches([], [group], matches, fulfilments, obligationsById)
    ).toEqual(new Set(['line1', 'line2']))
  })

  it('throws when asked to project from deeper to shallower', () => {
    expect(() =>
      projectMatches(
        [group, subGroup],
        [group],
        new Set(['line1/sub1']),
        {},
        obligationsById
      )
    ).toThrow(/deeper identity level to a shallower/)
  })
})

// ---------------------------------------------------------------------------
// resolveGate — primitives
// ---------------------------------------------------------------------------

describe('resolveGate — allowListed', () => {
  it('scalar match yields Set([""])', () => {
    const gate = allowListed(notif, ['a', 'b'])
    expect(resolveGate(gate, { [notif.id]: 'a' }, obligationsById)).toEqual({
      level: [],
      matches: new Set([''])
    })
  })

  it('scalar non-match yields empty set', () => {
    const gate = allowListed(notif, ['a', 'b'])
    expect(resolveGate(gate, { [notif.id]: 'c' }, obligationsById)).toEqual({
      level: [],
      matches: new Set()
    })
  })

  it('scalar with no stored value yields empty set', () => {
    const gate = allowListed(notif, ['a', 'b'])
    expect(resolveGate(gate, {}, obligationsById)).toEqual({
      level: [],
      matches: new Set()
    })
  })

  it('indexed matches only keys whose stored value is in the list', () => {
    const gate = allowListed(field, ['a', 'b'])
    const fulfilments = {
      [field.id]: { line1: 'a', line2: 'c', line3: 'b' }
    }
    expect(resolveGate(gate, fulfilments, obligationsById)).toEqual({
      level: [group],
      matches: new Set(['line1', 'line3'])
    })
  })

  it('indexed with no storage yields empty set', () => {
    const gate = allowListed(field, ['a'])
    expect(resolveGate(gate, {}, obligationsById)).toEqual({
      level: [group],
      matches: new Set()
    })
  })
})

describe('resolveGate — matches', () => {
  it('scalar matches exact value', () => {
    const gate = matches(notif, 'yes')
    expect(resolveGate(gate, { [notif.id]: 'yes' }, obligationsById)).toEqual({
      level: [],
      matches: new Set([''])
    })
  })

  it('scalar rejects other values', () => {
    const gate = matches(notif, 'yes')
    expect(resolveGate(gate, { [notif.id]: 'no' }, obligationsById)).toEqual({
      level: [],
      matches: new Set()
    })
  })

  it('indexed matches keys with equal value', () => {
    const gate = matches(field, 'x')
    const fulfilments = { [field.id]: { line1: 'x', line2: 'y', line3: 'x' } }
    expect(resolveGate(gate, fulfilments, obligationsById)).toEqual({
      level: [group],
      matches: new Set(['line1', 'line3'])
    })
  })
})

describe('resolveGate — present', () => {
  it('scalar matches when defined', () => {
    const gate = present(notif)
    expect(
      resolveGate(gate, { [notif.id]: 'anything' }, obligationsById)
    ).toEqual({ level: [], matches: new Set(['']) })
  })

  it('scalar rejects when undefined', () => {
    const gate = present(notif)
    expect(resolveGate(gate, {}, obligationsById)).toEqual({
      level: [],
      matches: new Set()
    })
  })

  it('indexed matches every stored key regardless of value', () => {
    const gate = present(field)
    const fulfilments = { [field.id]: { line1: 'x', line2: '' } }
    expect(resolveGate(gate, fulfilments, obligationsById)).toEqual({
      level: [group],
      matches: new Set(['line1', 'line2'])
    })
  })

  it('indexed with no storage yields empty set', () => {
    expect(resolveGate(present(field), {}, obligationsById)).toEqual({
      level: [group],
      matches: new Set()
    })
  })
})

// ---------------------------------------------------------------------------
// resolveGate — compositions
// ---------------------------------------------------------------------------

describe('resolveGate — and', () => {
  it('and([]) is trivially true (scalar)', () => {
    expect(resolveGate(and(), {}, obligationsById)).toEqual({
      level: [],
      matches: new Set([''])
    })
  })

  it('intersects same-level match sets', () => {
    const g1 = allowListed(field, ['x', 'y'])
    const g2 = allowListed(field, ['y', 'z'])
    const fulfilments = { [field.id]: { l1: 'x', l2: 'y', l3: 'z' } }
    expect(resolveGate(and(g1, g2), fulfilments, obligationsById)).toEqual({
      level: [group],
      matches: new Set(['l2'])
    })
  })

  it('projects mixed levels to the deepest before intersecting', () => {
    // g1 at scalar (matches everything if true), g2 at depth-1
    const g1 = present(notif)
    const g2 = allowListed(field, ['x'])
    const fulfilments = {
      [notif.id]: 'set',
      [field.id]: { l1: 'x', l2: 'y' }
    }
    // g1 broadcasts to all field-instance paths; intersect with g2's {l1}
    expect(resolveGate(and(g1, g2), fulfilments, obligationsById)).toEqual({
      level: [group],
      matches: new Set(['l1'])
    })
  })
})

describe('resolveGate — or', () => {
  it('or([]) is trivially false', () => {
    expect(resolveGate(or(), {}, obligationsById)).toEqual({
      level: [],
      matches: new Set()
    })
  })

  it('unions same-level match sets', () => {
    const g1 = allowListed(field, ['x'])
    const g2 = allowListed(field, ['z'])
    const fulfilments = { [field.id]: { l1: 'x', l2: 'y', l3: 'z' } }
    expect(resolveGate(or(g1, g2), fulfilments, obligationsById)).toEqual({
      level: [group],
      matches: new Set(['l1', 'l3'])
    })
  })

  it('projects mixed levels to the deepest before unioning', () => {
    const g1 = matches(notif, 'yes') // scalar
    const g2 = allowListed(field, ['x']) // depth-1
    const fulfilments = {
      [notif.id]: 'yes',
      [field.id]: { l1: 'z', l2: 'x' }
    }
    // g1 broadcasts to every field-instance path; union with g2's {l2}
    expect(resolveGate(or(g1, g2), fulfilments, obligationsById)).toEqual({
      level: [group],
      matches: new Set(['l1', 'l2'])
    })
  })
})

describe('resolveGate — not', () => {
  it('scalar: inverts a positive result to empty', () => {
    const gate = not(matches(notif, 'yes'))
    expect(resolveGate(gate, { [notif.id]: 'yes' }, obligationsById)).toEqual({
      level: [],
      matches: new Set()
    })
  })

  it('scalar: inverts a negative result to the full scalar set', () => {
    const gate = not(matches(notif, 'yes'))
    expect(resolveGate(gate, { [notif.id]: 'no' }, obligationsById)).toEqual({
      level: [],
      matches: new Set([''])
    })
  })

  it('indexed: complement against current instance-paths', () => {
    const gate = not(allowListed(field, ['x']))
    const fulfilments = { [field.id]: { l1: 'x', l2: 'y', l3: 'z' } }
    // instance paths at [group]: {l1, l2, l3}. Positive matches: {l1}.
    // Complement: {l2, l3}.
    expect(resolveGate(gate, fulfilments, obligationsById)).toEqual({
      level: [group],
      matches: new Set(['l2', 'l3'])
    })
  })

  it('double negation restores the original set', () => {
    const gate = not(not(allowListed(field, ['x'])))
    const fulfilments = { [field.id]: { l1: 'x', l2: 'y' } }
    expect(resolveGate(gate, fulfilments, obligationsById)).toEqual({
      level: [group],
      matches: new Set(['l1'])
    })
  })
})

// ---------------------------------------------------------------------------
// resolveGate — projections
// ---------------------------------------------------------------------------

describe('resolveGate — any', () => {
  it('scalar true when sub-gate matches at least one path', () => {
    const gate = any(group, allowListed(field, ['x']))
    const fulfilments = { [field.id]: { l1: 'x', l2: 'y' } }
    expect(resolveGate(gate, fulfilments, obligationsById)).toEqual({
      level: [],
      matches: new Set([''])
    })
  })

  it('scalar false when no path matches', () => {
    const gate = any(group, allowListed(field, ['x']))
    const fulfilments = { [field.id]: { l1: 'y', l2: 'z' } }
    expect(resolveGate(gate, fulfilments, obligationsById)).toEqual({
      level: [],
      matches: new Set()
    })
  })

  it('scalar false when no instances exist at all', () => {
    const gate = any(group, allowListed(field, ['x']))
    expect(resolveGate(gate, {}, obligationsById)).toEqual({
      level: [],
      matches: new Set()
    })
  })
})

describe('resolveGate — every', () => {
  it('scalar true when every current path matches', () => {
    const gate = every(group, allowListed(field, ['x']))
    const fulfilments = { [field.id]: { l1: 'x', l2: 'x' } }
    expect(resolveGate(gate, fulfilments, obligationsById)).toEqual({
      level: [],
      matches: new Set([''])
    })
  })

  it('scalar false when at least one path does not match', () => {
    const gate = every(group, allowListed(field, ['x']))
    const fulfilments = { [field.id]: { l1: 'x', l2: 'y' } }
    expect(resolveGate(gate, fulfilments, obligationsById)).toEqual({
      level: [],
      matches: new Set()
    })
  })

  it('scalar vacuously true when no paths exist at the sub-gate level', () => {
    const gate = every(group, allowListed(field, ['x']))
    expect(resolveGate(gate, {}, obligationsById)).toEqual({
      level: [],
      matches: new Set([''])
    })
  })
})

// ---------------------------------------------------------------------------
// resolveGatedBy — public API
// ---------------------------------------------------------------------------

describe('resolveGatedBy — shortcut form', () => {
  it('scalar in-scope decision when gate is true', () => {
    const gatedBy = matches(notif, 'yes')
    const decisions = resolveGatedBy(
      gatedBy,
      notif,
      { [notif.id]: 'yes' },
      obligationsById
    )
    expect(decisions.get('')).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [
        {
          code: 'obligation.notif.applicable.becauseGateSatisfied',
          explanation: 'notif applies when its gatedBy condition is satisfied'
        }
      ]
    })
  })

  it('scalar out-of-scope decision when gate is false', () => {
    const gatedBy = matches(notif, 'yes')
    const decisions = resolveGatedBy(
      gatedBy,
      notif,
      { [notif.id]: 'no' },
      obligationsById
    )
    expect(decisions.get('')).toEqual({ inScope: false })
  })

  it('per-path decisions for an indexed obligation', () => {
    const gatedBy = allowListed(field, ['x'])
    // Field storage has three lines; only l1 matches.
    const fulfilments = { [field.id]: { l1: 'x', l2: 'y', l3: 'z' } }
    const decisions = resolveGatedBy(
      gatedBy,
      field,
      fulfilments,
      obligationsById
    )
    expect(decisions.get('l1')).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [
        {
          code: 'obligation.field.applicable.becauseGateSatisfied',
          explanation: 'field applies when its gatedBy condition is satisfied'
        }
      ]
    })
    expect(decisions.get('l2')).toEqual({ inScope: false })
    expect(decisions.get('l3')).toEqual({ inScope: false })
  })

  it('depth-2 gated obligation — gate at depth-1 expands per current unit-path', () => {
    // subField is at depth-2 [group, subGroup]. Gate is at depth-1 [group].
    // The resolver expands the depth-1 matches down to every currently-
    // existing depth-2 path with that prefix.
    const gatedBy = allowListed(field, ['x'])
    const fulfilments = {
      [field.id]: { l1: 'x', l2: 'y' },
      [subField.id]: { 'l1/s1': 'a', 'l1/s2': 'b', 'l2/s1': 'c' }
    }
    const decisions = resolveGatedBy(
      gatedBy,
      subField,
      fulfilments,
      obligationsById
    )
    // Expected in-scope: l1/s1, l1/s2. Out of scope: l2/s1.
    expect(decisions.get('l1/s1').inScope).toBe(true)
    expect(decisions.get('l1/s2').inScope).toBe(true)
    expect(decisions.get('l2/s1')).toEqual({ inScope: false })
  })
})

describe('resolveGatedBy — extended form (retain-value pattern)', () => {
  it('uses whenTrue/whenFalse explicit branches', () => {
    const gatedBy = {
      when: matches(notif, 'yes'),
      whenTrue: { inScope: true, status: 'mandatory' },
      whenFalse: { inScope: true, status: 'optional' }
    }
    const on = resolveGatedBy(
      gatedBy,
      notif,
      { [notif.id]: 'yes' },
      obligationsById
    )
    const off = resolveGatedBy(
      gatedBy,
      notif,
      { [notif.id]: 'no' },
      obligationsById
    )
    expect(on.get('')).toEqual({ inScope: true, status: 'mandatory' })
    expect(off.get('')).toEqual({ inScope: true, status: 'optional' })
  })

  it('supports custom reasons in whenTrue', () => {
    const customReason = {
      code: 'obligation.notif.applicable.becauseCustom',
      explanation: 'custom reason'
    }
    const gatedBy = {
      when: matches(notif, 'yes'),
      whenTrue: {
        inScope: true,
        status: 'mandatory',
        reasons: [customReason]
      },
      whenFalse: { inScope: false }
    }
    const decisions = resolveGatedBy(
      gatedBy,
      notif,
      { [notif.id]: 'yes' },
      obligationsById
    )
    expect(decisions.get('').reasons).toEqual([customReason])
  })
})
