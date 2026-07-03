import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { createFlowConditionRegistry } from './applies-when.js'
import { journeyState, JOURNEY_STATES } from './journey-state.js'
import { evaluateObligations } from '../engine/evaluate.js'
import { loadJourneyModel } from '../engine/load-model.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const flow = JSON.parse(
  fs.readFileSync(path.join(dirname, '../model/flow.json'), 'utf8')
)

const buildObligationFixtures = () => {
  const entries = []
  const addObligation = (name, overrides) => {
    entries.push([
      name,
      {
        name,
        inScope: true,
        status: 'optional',
        reasons: [],
        fulfilled: false,
        ...overrides
      }
    ])
    return { obligation: name }
  }
  const page = (id, status) => ({
    kind: 'page',
    id,
    presents: [
      addObligation(`${id}-main`, {
        status: 'mandatory',
        fulfilled: status === 'fulfilled'
      })
    ]
  })
  const evaluation = (fulfilments = {}) => ({
    obligations: Object.fromEntries(entries),
    fulfilments,
    drops: []
  })
  return { page, evaluation }
}

const group = (id, children, overrides = {}) => ({
  kind: 'group',
  id,
  children,
  ...overrides
})

describe('flow-eval/journey-state — fixture trees', () => {
  it('pins the four lifecycle states', () => {
    expect(JOURNEY_STATES).toEqual([
      'notStarted',
      'inProgress',
      'fulfilled',
      'submitted'
    ])
  })

  it('is Submitted whenever the stored flag says so — nothing is derived', () => {
    const { page, evaluation } = buildObligationFixtures()
    const fixture = { sections: [group('who', [page('a', 'notStarted')])] }
    expect(journeyState(fixture, evaluation(), { submitted: true })).toBe(
      'submitted'
    )
  })

  it('is Not Started while every applicable Section is Not Started', () => {
    const { page, evaluation } = buildObligationFixtures()
    const fixture = {
      sections: [
        group('who', [page('a', 'notStarted')]),
        group('site', [page('b', 'notStarted')])
      ]
    }
    expect(journeyState(fixture, evaluation())).toBe('notStarted')
  })

  it('is In Progress once some Section is In Progress or Fulfilled', () => {
    const { page, evaluation } = buildObligationFixtures()
    const fixture = {
      sections: [
        group('who', [page('a', 'fulfilled')]),
        group('site', [page('b', 'notStarted')])
      ]
    }
    expect(journeyState(fixture, evaluation())).toBe('inProgress')
  })

  it('is Fulfilled iff every applicable Section is Fulfilled, NA filtered', () => {
    const conditions = createFlowConditionRegistry()
    conditions.define(
      'keepsBees',
      ({ fulfilments }) => fulfilments.keepsBees?.value === 'yes'
    )
    const { page, evaluation } = buildObligationFixtures()
    const fixture = {
      sections: [
        group('who', [page('a', 'fulfilled')]),
        group('livestock', [page('hives', 'notStarted')], {
          appliesWhen: 'keepsBees'
        })
      ]
    }
    expect(journeyState(fixture, evaluation(), { conditions })).toBe(
      'fulfilled'
    )
    const beekeeper = evaluation({ keepsBees: { value: 'yes' } })
    expect(journeyState(fixture, beekeeper, { conditions })).toBe('inProgress')
  })

  it('does not count a fulfilment no applicable Section presents (provisional NAV-33/34 pick)', () => {
    // The system-written premium sits behind the gated quote Section; a
    // journey holding ONLY such a fulfilment still reads Not Started.
    const conditions = createFlowConditionRegistry()
    conditions.define('never', () => false)
    const { page, evaluation } = buildObligationFixtures()
    const fixture = {
      sections: [
        group('who', [page('a', 'notStarted')]),
        group('quote', [page('premium-view', 'notStarted')], {
          appliesWhen: 'never'
        })
      ]
    }
    const stateWithOrphan = evaluation({
      'premium-view-main': { value: '540' }
    })
    expect(journeyState(fixture, stateWithOrphan, { conditions })).toBe(
      'notStarted'
    )
  })
})

describe('flow-eval/journey-state — over the real model and Flow', () => {
  const { obligations } = loadJourneyModel()
  const id = (name) => obligations.find((record) => record.name === name).id
  const state = (values) =>
    Object.fromEntries(
      Object.entries(values).map(([name, value]) => [id(name), { value }])
    )

  it('starts Not Started on an empty journey', () => {
    expect(journeyState(flow, evaluateObligations(obligations, {}))).toBe(
      'notStarted'
    )
  })

  it('moves to In Progress after the email gate alone', () => {
    const evaluation = evaluateObligations(
      obligations,
      state({ email: 'sam@example.com' })
    )
    expect(journeyState(flow, evaluation)).toBe('inProgress')
  })

  it('is Fulfilled on the no-claims happy path and Submitted after the flip', () => {
    const evaluation = evaluateObligations(
      obligations,
      state({
        email: 'sam@example.com',
        fullName: 'Sam Smith',
        registration: 'AB12 CDE',
        hadClaims: 'no',
        coverType: 'comprehensive',
        extras: [],
        addons: []
      })
    )
    expect(journeyState(flow, evaluation)).toBe('fulfilled')
    expect(journeyState(flow, evaluation, { submitted: true })).toBe(
      'submitted'
    )
  })

  it('drops back from Fulfilled when a wipe re-opens mandatory work', () => {
    const evaluation = evaluateObligations(
      obligations,
      state({
        email: 'sam@example.com',
        fullName: 'Sam Smith',
        registration: 'AB12 CDE',
        hadClaims: 'yes', // claims now mandatory and empty
        coverType: 'comprehensive',
        extras: [],
        addons: []
      })
    )
    expect(journeyState(flow, evaluation)).toBe('inProgress')
  })
})
