import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { runToFixedPoint } from './fixed-point.js'
import { createScopeRegistry, loadJourneyModel } from '../engine/index.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const { obligations, identifiers } = loadJourneyModel()
const id = (name) => identifiers.idOf(name)

describe('orchestrator/fixed-point — the EVAL-35 sketch', () => {
  it('stays tagged as realising the unreviewed sketch until the review lands', () => {
    const source = fs.readFileSync(path.join(dirname, 'fixed-point.js'), 'utf8')
    expect(source).toContain('EVAL-35')
    expect(source).toContain('TODO review with Sam')
  })

  it('converges on the real journey, firing the quote during the pass (never at submit)', () => {
    const { fulfilments, evaluation, iterations } = runToFixedPoint(
      obligations,
      {
        [id('coverType')]: { value: 'third-party' }
      }
    )
    expect(fulfilments[id('premium')]).toEqual({ value: 336 })
    expect(evaluation.fulfilments).toEqual(fulfilments)
    expect(iterations).toBeLessThanOrEqual(3)
  })

  it('adopts the pruned set, surfacing drops as data for the caller to log', () => {
    const { fulfilments, drops } = runToFixedPoint(obligations, {
      'id-no-longer-in-model': { value: 'stale' },
      [id('fullName')]: { value: 'Alex Driver' }
    })
    expect(fulfilments['id-no-longer-in-model']).toBeUndefined()
    expect(fulfilments[id('fullName')]).toEqual({ value: 'Alex Driver' })
    expect(drops).toContainEqual({
      obligationId: 'id-no-longer-in-model',
      reason: 'unknown-obligation'
    })
  })

  it('Yes-No-Yes at the seam: the wipe destroys claims data and nothing rehydrates', () => {
    const withClaim = runToFixedPoint(obligations, {
      [id('hadClaims')]: { value: 'yes' },
      [id('claimType')]: { 'f-1': { value: 'theft' } },
      [id('claimAmount')]: { 'f-1': { value: '450' } }
    })
    expect(withClaim.fulfilments[id('claimType')]).toEqual({
      'f-1': { value: 'theft' }
    })

    const afterNo = runToFixedPoint(obligations, {
      ...withClaim.fulfilments,
      [id('hadClaims')]: { value: 'no' }
    })
    expect(afterNo.fulfilments[id('claimType')]).toBeUndefined()
    expect(afterNo.fulfilments[id('claimAmount')]).toBeUndefined()
    expect(afterNo.wiped.map((wipe) => wipe.name).sort()).toEqual([
      'claimAmount',
      'claimType'
    ])

    const afterYesAgain = runToFixedPoint(obligations, {
      ...afterNo.fulfilments,
      [id('hadClaims')]: { value: 'yes' }
    })
    expect(afterYesAgain.fulfilments[id('claimType')]).toBeUndefined()
  })

  it('keeps derived addon follow-ups in lockstep: spawn on select, wipe on deselect', () => {
    const selected = runToFixedPoint(obligations, {
      [id('addons')]: { value: ['named-driver'] }
    })
    expect(selected.fulfilments[id('driverName')]).toEqual({
      'named-driver': { value: '' }
    })

    const filled = runToFixedPoint(obligations, {
      ...selected.fulfilments,
      [id('driverName')]: { 'named-driver': { value: 'Sam Passenger' } }
    })
    const deselected = runToFixedPoint(obligations, {
      ...filled.fulfilments,
      [id('addons')]: { value: [] }
    })
    expect(deselected.fulfilments[id('driverName')]).toBeUndefined()
  })

  it('runs handlers over post-wipe state (the pinned iteration order)', () => {
    const fixture = [
      { id: 'id-flag', name: 'flag', type: 'text', cardinality: 'single' },
      { id: 'id-target', name: 'target', type: 'text', cardinality: 'single' },
      {
        id: 'id-echo',
        name: 'echo',
        type: 'text',
        cardinality: 'single',
        handler: 'echo'
      }
    ]
    const registry = createScopeRegistry()
    registry.register('target', 'flagIsYes', (view) =>
      view.valueOf('flag') === 'yes' ? { status: 'optional' } : null
    )
    const { fulfilments } = runToFixedPoint(
      fixture,
      {
        'id-flag': { value: 'no' },
        'id-target': { value: 'stale' }
      },
      {
        scopeRegistry: registry,
        handlers: {
          echo: { handle: ({ answers }) => answers.target ?? 'wiped' }
        }
      }
    )
    expect(fulfilments['id-target']).toBeUndefined()
    expect(fulfilments['id-echo']).toEqual({ value: 'wiped' })
  })

  it('throws loudly instead of spinning when the pass cannot stabilise in bound', () => {
    // Oscillator: ping is in scope only while blank; its handler fills it;
    // the wipe then empties it. The per-request dedupe normally breaks the
    // cycle at iteration 3 — a bound of 2 must throw, never spin.
    const fixture = [
      {
        id: 'id-ping',
        name: 'ping',
        type: 'text',
        cardinality: 'single',
        handler: 'echo'
      }
    ]
    const registry = createScopeRegistry()
    registry.register('ping', 'inScopeWhileBlank', (view) =>
      view.valueOf('ping') === undefined ? { status: 'optional' } : null
    )
    const options = (maxIterations) => ({
      scopeRegistry: registry,
      handlers: { echo: { handle: () => 'pong' } },
      maxIterations
    })
    expect(() => runToFixedPoint(fixture, {}, options(2))).toThrow(
      /did not converge within 2 iterations/
    )
    expect(runToFixedPoint(fixture, {}, options(10)).iterations).toBe(3)
  })

  it('is pure on the fulfilments it is given', () => {
    const stored = { [id('hadClaims')]: { value: 'yes' } }
    runToFixedPoint(obligations, stored)
    expect(stored).toEqual({ [id('hadClaims')]: { value: 'yes' } })
  })
})
