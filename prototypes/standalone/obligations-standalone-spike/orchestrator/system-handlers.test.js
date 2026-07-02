import { describe, it, expect, vi } from 'vitest'
import { createSystemHandlerRun, systemHandlers } from './system-handlers.js'
import { loadJourneyModel } from '../engine/index.js'

const inScopeState = (obligations) =>
  Object.fromEntries(
    obligations.map((record) => [
      record.id,
      { name: record.name, inScope: true }
    ])
  )

describe('orchestrator/system-handlers — the quote handler', () => {
  const { obligations, identifiers } = loadJourneyModel()
  const premiumId = identifiers.idOf('premium')

  it('prices a half-empty journey through the real formula (unified-map write, no metadata)', () => {
    const run = createSystemHandlerRun()
    const { fulfilments, changed, ran } = run(
      obligations,
      inScopeState(obligations),
      { [identifiers.idOf('coverType')]: { value: 'third-party' } }
    )
    // round(480 * 0.7) = 336 — same constants and floor as spike-a.
    expect(fulfilments[premiumId]).toEqual({ value: 336 })
    expect(changed).toBe(true)
    expect(ran).toEqual(['premium'])
  })

  it('recomputes as answers change and reports no change when stable', () => {
    const answers = {
      [identifiers.idOf('coverType')]: { value: 'comprehensive' },
      [identifiers.idOf('estimatedValue')]: { value: '12000' },
      [identifiers.idOf('hadClaims')]: { value: 'yes' },
      [identifiers.idOf('extras')]: { value: ['breakdown'] }
    }
    const first = createSystemHandlerRun()(
      obligations,
      inScopeState(obligations),
      answers
    )
    // round((480 + 120) * 1) + 120 + 60 = 780.
    expect(first.fulfilments[premiumId]).toEqual({ value: 780 })

    const second = createSystemHandlerRun()(
      obligations,
      inScopeState(obligations),
      first.fulfilments
    )
    expect(second.changed).toBe(false)
    expect(second.fulfilments).toEqual(first.fulfilments)
  })

  it('never fires while its obligation is out of scope', () => {
    const state = inScopeState(obligations)
    state[premiumId] = { name: 'premium', inScope: false }
    const { fulfilments, ran } = createSystemHandlerRun()(
      obligations,
      state,
      {}
    )
    expect(fulfilments[premiumId]).toBeUndefined()
    expect(ran).toEqual([])
  })

  it('is pure on the fulfilments it is given', () => {
    const stored = {}
    createSystemHandlerRun()(obligations, inScopeState(obligations), stored)
    expect(stored).toEqual({})
  })
})

describe('orchestrator/system-handlers — registry mechanics', () => {
  const record = {
    id: 'id-ping',
    name: 'ping',
    type: 'text',
    cardinality: 'single',
    handler: 'echo'
  }

  it('dedupes in-flight invocations: one call per obligation per request runner', () => {
    const handle = vi.fn(() => 'pong')
    const run = createSystemHandlerRun({ handlers: { echo: { handle } } })
    const first = run([record], inScopeState([record]), {})
    run([record], inScopeState([record]), first.fulfilments)
    expect(handle).toHaveBeenCalledTimes(1)

    const freshRun = createSystemHandlerRun({ handlers: { echo: { handle } } })
    freshRun([record], inScopeState([record]), first.fulfilments)
    expect(handle).toHaveBeenCalledTimes(2)
  })

  it('hands the handler a name-keyed answers view over single fulfilments', () => {
    const seen = []
    const run = createSystemHandlerRun({
      handlers: { echo: { handle: ({ answers }) => seen.push(answers) } }
    })
    const flag = {
      id: 'id-flag',
      name: 'flag',
      type: 'text',
      cardinality: 'single'
    }
    run([record, flag], inScopeState([record, flag]), {
      'id-flag': { value: 'up' }
    })
    expect(seen[0].flag).toBe('up')
  })

  it('throws loudly on an unknown handler name', () => {
    expect(() =>
      createSystemHandlerRun({ handlers: {} })(
        [record],
        inScopeState([record]),
        {}
      )
    ).toThrow(/unknown handler "echo"/)
  })

  it('carries failurePolicy as a stored-and-ignored deferred slot', () => {
    expect(systemHandlers.quote.failurePolicy).toBe('ignored')
  })
})
