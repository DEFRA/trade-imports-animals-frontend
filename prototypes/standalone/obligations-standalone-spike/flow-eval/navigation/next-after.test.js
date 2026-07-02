import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { createFlowConditionRegistry } from '../applies-when.js'
import { nextAfter } from './next-after.js'
import { evaluateObligations } from '../../engine/evaluate.js'
import { loadJourneyModel } from '../../engine/load-model.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const flow = JSON.parse(
  fs.readFileSync(path.join(dirname, '../../model/flow.json'), 'utf8')
)

/** Same status-through-obligations kit as first-unfulfilled-page.test. */
const kit = () => {
  const entries = []
  const ob = (name, over) => {
    entries.push([
      name,
      {
        name,
        inScope: true,
        status: 'optional',
        reasons: [],
        fulfilled: false,
        ...over
      }
    ])
    return { obligation: name }
  }
  const page = (id, status, over = {}) => {
    if (status === 'notApplicable') {
      return { kind: 'page', id, ...over }
    }
    return {
      kind: 'page',
      id,
      presents: [
        ob(`${id}-main`, {
          status: 'mandatory',
          fulfilled: status === 'fulfilled'
        })
      ],
      ...over
    }
  }
  const evaluation = (fulfilments = {}) => ({
    obligations: Object.fromEntries(entries),
    fulfilments,
    drops: []
  })
  return { page, evaluation }
}

const group = (id, children, over = {}) => ({
  kind: 'group',
  id,
  children,
  ...over
})

const conditions = createFlowConditionRegistry()
conditions.define(
  'keepsBees',
  ({ fulfilments }) => fulfilments.keepsBees?.value === 'yes'
)

describe('flow-eval/navigation/next-after — fixture trees', () => {
  it('advances to the next Not Started Page in declared order', () => {
    const { page, evaluation } = kit()
    const flowFixture = {
      sections: [
        group('who', [page('a', 'fulfilled'), page('b', 'notStarted')])
      ]
    }
    expect(nextAfter(flowFixture, 'a', evaluation())?.id).toBe('b')
  })

  it('skips already-Fulfilled and Not Applicable Pages (status-filtered rule)', () => {
    const { page, evaluation } = kit()
    const flowFixture = {
      sections: [
        group('who', [
          page('a', 'notStarted'),
          page('done', 'fulfilled'),
          page('intro', 'notApplicable'),
          page('c', 'inProgress')
        ])
      ]
    }
    expect(nextAfter(flowFixture, 'a', evaluation())?.id).toBe('c')
  })

  it('excludes the Pages of a gated-out SubSection wholesale', () => {
    const { page, evaluation } = kit()
    const flowFixture = {
      sections: [
        group('who', [
          page('a', 'notStarted'),
          group('livestock', [page('hives', 'notStarted')], {
            appliesWhen: 'keepsBees'
          }),
          page('c', 'notStarted')
        ])
      ]
    }
    expect(nextAfter(flowFixture, 'a', evaluation(), { conditions })?.id).toBe(
      'c'
    )
    const beekeeper = evaluation({ keepsBees: { value: 'yes' } })
    expect(nextAfter(flowFixture, 'a', beekeeper, { conditions })?.id).toBe(
      'hives'
    )
  })

  it('returns null at the end of the Section (back to the hub)', () => {
    const { page, evaluation } = kit()
    const flowFixture = {
      sections: [
        group('who', [page('a', 'notStarted'), page('b', 'fulfilled')])
      ]
    }
    expect(nextAfter(flowFixture, 'a', evaluation())).toBeNull()
    expect(nextAfter(flowFixture, 'b', evaluation())).toBeNull()
  })

  it('never advances across a Section boundary', () => {
    const { page, evaluation } = kit()
    const flowFixture = {
      sections: [
        group('who', [page('a', 'notStarted')]),
        group('site', [page('b', 'notStarted')])
      ]
    }
    expect(nextAfter(flowFixture, 'a', evaluation())).toBeNull()
  })

  it('throws loudly on an unknown page id', () => {
    const { page, evaluation } = kit()
    const flowFixture = { sections: [group('who', [page('a', 'notStarted')])] }
    expect(() => nextAfter(flowFixture, 'ghost', evaluation())).toThrow(
      'Unknown page "ghost"'
    )
  })
})

describe('flow-eval/navigation/next-after — over the real model and Flow', () => {
  const { obligations } = loadJourneyModel()
  const id = (name) => obligations.find((record) => record.name === name).id
  const state = (values) =>
    Object.fromEntries(
      Object.entries(values).map(([name, value]) => [id(name), { value }])
    )

  it('advances driving-history to the claims list when hadClaims is yes', () => {
    const evaluation = evaluateObligations(
      obligations,
      state({ hadClaims: 'yes' })
    )
    expect(nextAfter(flow, 'driving-history', evaluation)?.id).toBe('claims')
  })

  it('skips the gated claims Page when hadClaims is no', () => {
    const evaluation = evaluateObligations(
      obligations,
      state({ hadClaims: 'no' })
    )
    expect(nextAfter(flow, 'driving-history', evaluation)?.id).toBe(
      'cover-type'
    )
  })

  it('walks the addons Page into a selected add-on SubSection', () => {
    const withDriver = evaluateObligations(
      obligations,
      state({ addons: ['named-driver'] })
    )
    expect(nextAfter(flow, 'addons', withDriver)?.id).toBe('named-driver-who')
    const none = evaluateObligations(obligations, state({ addons: [] }))
    expect(nextAfter(flow, 'addons', none)).toBeNull()
  })
})
