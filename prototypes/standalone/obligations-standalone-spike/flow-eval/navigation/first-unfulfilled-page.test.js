import { describe, it, expect } from 'vitest'
import { firstApplicablePage } from './first-applicable-page.js'
import { firstUnfulfilledPage } from './first-unfulfilled-page.js'

/**
 * Fixture kit: pages carry a wanted status via the obligations they
 * present (non-car names — the generality rail). A read-only page is the
 * Not Applicable case; 'inProgress' pairs an unfulfilled mandatory with
 * a fulfilled optional.
 */
const kit = () => {
  const entries = []
  const obligation = (name, overrides) => {
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
  const page = (id, status) => {
    if (status === 'notApplicable') {
      return { kind: 'page', id }
    }
    const presents = [
      obligation(`${id}-main`, {
        status: 'mandatory',
        fulfilled: status === 'fulfilled'
      })
    ]
    if (status === 'inProgress') {
      presents.push(obligation(`${id}-extra`, { fulfilled: true }))
    }
    return { kind: 'page', id, presents }
  }
  const evaluation = () => ({
    obligations: Object.fromEntries(entries),
    fulfilments: {},
    drops: []
  })
  return { page, evaluation }
}

const group = (id, children) => ({ kind: 'group', id, children })

describe('flow-eval/navigation/first-unfulfilled-page', () => {
  it('returns null when every child is Fulfilled (callers degrade)', () => {
    const { page, evaluation } = kit()
    const section = group('who', [
      page('a', 'fulfilled'),
      page('b', 'fulfilled')
    ])
    expect(firstUnfulfilledPage(section, evaluation())).toBeNull()
  })

  it('returns the one In Progress Page among Fulfilled siblings', () => {
    const { page, evaluation } = kit()
    const section = group('who', [
      page('a', 'fulfilled'),
      page('b', 'inProgress'),
      page('c', 'fulfilled')
    ])
    expect(firstUnfulfilledPage(section, evaluation())?.id).toBe('b')
  })

  it('finds the first Not Started / In Progress in depth-first order across SubSections', () => {
    const { page, evaluation } = kit()
    const section = group('outer', [
      group('done', [page('a', 'fulfilled')]),
      group('mixed', [page('b', 'notStarted'), page('c', 'inProgress')])
    ])
    expect(firstUnfulfilledPage(section, evaluation())?.id).toBe('b')
  })

  it('skips Not Applicable Pages (read-only or dynamically empty) via the filter', () => {
    const { page, evaluation } = kit()
    const section = group('who', [
      page('intro', 'notApplicable'),
      page('a', 'fulfilled'),
      page('b', 'notStarted')
    ])
    expect(firstUnfulfilledPage(section, evaluation())?.id).toBe('b')
  })

  it('finds an incomplete leaf under deep nesting', () => {
    const { page, evaluation } = kit()
    const section = group('outer', [
      group('inner', [group('deepest', [page('buried', 'notStarted')])])
    ])
    expect(firstUnfulfilledPage(section, evaluation())?.id).toBe('buried')
  })

  it('prunes a Fulfilled SubSection ahead of an incomplete one wholesale', () => {
    const { page, evaluation } = kit()
    const section = group('outer', [
      group('done', [page('a', 'fulfilled'), page('b', 'fulfilled')]),
      group('todo', [page('c', 'notStarted')])
    ])
    expect(firstUnfulfilledPage(section, evaluation())?.id).toBe('c')
  })

  it('is rootable at the Flow', () => {
    const { page, evaluation } = kit()
    const flow = { sections: [group('who', [page('a', 'notStarted')])] }
    expect(firstUnfulfilledPage(flow, evaluation())?.id).toBe('a')
  })

  it('equals firstApplicablePage when nothing is fulfilled yet (doc equivalence)', () => {
    const { page, evaluation } = kit()
    const section = group('who', [
      group('inner', [page('a', 'notStarted')]),
      page('b', 'notStarted')
    ])
    expect(firstUnfulfilledPage(section, evaluation())).toBe(
      firstApplicablePage(section, evaluation())
    )
  })
})
