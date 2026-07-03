import { describe, it, expect } from 'vitest'
import { createFlowConditionRegistry } from '../applies-when.js'
import { firstApplicablePage } from './first-applicable-page.js'

/** Non-car fixture trees (generality rail) — status is irrelevant here. */
const page = (id, overrides = {}) => ({
  kind: 'page',
  id,
  presents: [{ obligation: `${id}-obligation` }],
  ...overrides
})
const group = (id, children, overrides = {}) => ({
  kind: 'group',
  id,
  children,
  ...overrides
})

const evaluation = { obligations: {}, fulfilments: {}, drops: [] }

const conditions = createFlowConditionRegistry()
conditions.define(
  'keepsBees',
  ({ fulfilments }) => fulfilments.keepsBees?.value === 'yes'
)

describe('flow-eval/navigation/first-applicable-page', () => {
  it('finds the first Page of a flat Section in declared order', () => {
    const section = group('who', [page('applicant'), page('site')])
    expect(firstApplicablePage(section, evaluation)?.id).toBe('applicant')
  })

  it('walks depth-first through SubSections and multi-level nesting', () => {
    const section = group('outer', [
      group('inner', [group('deepest', [page('buried')]), page('later')]),
      page('last')
    ])
    expect(firstApplicablePage(section, evaluation)?.id).toBe('buried')
  })

  it('handles a Section of only SubSections and a single-Page Section', () => {
    const subsOnly = group('subs', [
      group('a', [page('a1')]),
      group('b', [page('b1')])
    ])
    expect(firstApplicablePage(subsOnly, evaluation)?.id).toBe('a1')
    expect(
      firstApplicablePage(group('one', [page('solo')]), evaluation)?.id
    ).toBe('solo')
  })

  it('returns null for an empty Section', () => {
    expect(firstApplicablePage(group('empty', []), evaluation)).toBeNull()
  })

  it('is rootable at the Flow, a Section or a SubSection', () => {
    const sub = group('sub', [page('nested')])
    const flow = { sections: [group('top', [sub])] }
    expect(firstApplicablePage(flow, evaluation)?.id).toBe('nested')
    expect(firstApplicablePage(sub, evaluation)?.id).toBe('nested')
  })

  it('is status-blind: read-only Pages appear in the walk like any other', () => {
    const section = group('who', [
      { kind: 'page', id: 'intro' },
      page('applicant')
    ])
    expect(firstApplicablePage(section, evaluation)?.id).toBe('intro')
  })

  it('filters through appliesWhen gating only', () => {
    const section = group('who', [
      page('hives', { appliesWhen: 'keepsBees' }),
      page('applicant')
    ])
    expect(firstApplicablePage(section, evaluation, { conditions })?.id).toBe(
      'applicant'
    )
    const beekeeper = {
      ...evaluation,
      fulfilments: { keepsBees: { value: 'yes' } }
    }
    expect(firstApplicablePage(section, beekeeper, { conditions })?.id).toBe(
      'hives'
    )
  })

  it('returns null when the root itself is gated out', () => {
    const gated = group('livestock', [page('hives')], {
      appliesWhen: 'keepsBees'
    })
    expect(firstApplicablePage(gated, evaluation, { conditions })).toBeNull()
  })
})
