import { readFileSync } from 'node:fs'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { model, isModelB } from './model-flag.js'
import {
  makeScope,
  makeScopeA,
  configureReadyForCheckYourAnswers
} from './read.js'
import { makeScopeFromB } from '../model/bridge/scope.js'

// inc-012 — the MODEL=a|b flag that routes engine/read.js's makeScope through
// either A's engine (default) or B's bridge. The reversibility guarantee is
// that with MODEL unset or 'a' the scope is byte-identical to A's today; the
// oracle (model-equivalence.test.js) proves makeScopeA vs makeScopeFromB, so
// proving makeScope delegates to each transfers those guarantees.

const happyPath = JSON.parse(
  readFileSync(new URL('../spec/fixtures/happy-path.json', import.meta.url))
).values

// A and B agree on scope here (requirement === 'yes').
const regionRequired = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'yes',
  regionOfOriginCode: 'FR-75'
}
// The ruled c-017 divergence: A gates regionOfOriginCode on 'yes', B retains it.
const regionNotRequired = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'no',
  regionOfOriginCode: 'FR-75'
}

const keys = (scope) => [...scope.inScope].sort()

// process.env is process-global and vitest reuses worker processes across
// files — a leaked MODEL=b would flip every later file's makeScope. Capture
// the boot value and restore it after every test.
const ORIGINAL_MODEL = process.env.MODEL

beforeAll(() => configureReadyForCheckYourAnswers(() => false))

afterEach(() => {
  if (ORIGINAL_MODEL === undefined) delete process.env.MODEL
  else process.env.MODEL = ORIGINAL_MODEL
})

describe('#model / #isModelB — the flag', () => {
  it('Should default to "a" when MODEL is unset', () => {
    delete process.env.MODEL
    expect(model()).toBe('a')
    expect(isModelB()).toBe(false)
  })

  it('Should report "b" only when MODEL is exactly "b"', () => {
    process.env.MODEL = 'b'
    expect(model()).toBe('b')
    expect(isModelB()).toBe(true)
  })

  it('Should treat an explicit MODEL="a" as A', () => {
    process.env.MODEL = 'a'
    expect(model()).toBe('a')
    expect(isModelB()).toBe(false)
  })
})

describe('#makeScope — default (a) path is byte-identical to A', () => {
  it('Should return A’s engine result when MODEL is unset', () => {
    delete process.env.MODEL
    for (const answers of [happyPath, regionRequired, regionNotRequired]) {
      const a = makeScopeA(answers)
      const dispatched = makeScope(answers)
      expect(keys(dispatched)).toEqual(keys(a))
      expect(dispatched.readyForCheckYourAnswers).toBe(
        a.readyForCheckYourAnswers
      )
    }
  })

  it('Should return A’s engine result when MODEL is explicitly "a"', () => {
    process.env.MODEL = 'a'
    const a = makeScopeA(happyPath)
    const dispatched = makeScope(happyPath)
    expect(keys(dispatched)).toEqual(keys(a))
    expect(dispatched.readyForCheckYourAnswers).toBe(a.readyForCheckYourAnswers)
  })
})

describe('#makeScope — b path delegates to B’s bridge', () => {
  it('Should return makeScopeFromB verbatim when MODEL="b"', () => {
    process.env.MODEL = 'b'
    for (const answers of [happyPath, regionRequired, regionNotRequired]) {
      const b = makeScopeFromB(answers)
      const dispatched = makeScope(answers)
      expect(keys(dispatched)).toEqual(keys(b))
      expect(dispatched.readyForCheckYourAnswers).toBe(
        b.readyForCheckYourAnswers
      )
    }
  })
})

// The flag genuinely changes the scope A's runtime sees. The full behavioural
// sweep (makeScopeA vs makeScopeFromB, modulo the 3 ruled divergences, incl.
// the structural deltas the raw diff carries) is the oracle's job in
// model-equivalence.test.js; because makeScope delegates verbatim to each
// (proved above), those guarantees transfer. Here we pin one ruled divergence
// through the flag so a behavioural flip is observable, not just delegation.
describe('#makeScope — the flag flips behaviour on the ruled c-017 divergence', () => {
  it('Should gate regionOfOriginCode out under A but retain it under B (c-017)', () => {
    delete process.env.MODEL
    expect(makeScope(regionNotRequired).has('regionOfOriginCode')).toBe(false)
    process.env.MODEL = 'b'
    expect(makeScope(regionNotRequired).has('regionOfOriginCode')).toBe(true)
  })
})
