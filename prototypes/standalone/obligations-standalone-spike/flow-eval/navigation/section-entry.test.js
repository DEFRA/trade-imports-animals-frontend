import { describe, it, expect } from 'vitest'
import { sectionEntry, SECTION_ENTRY_MODES } from './section-entry.js'

/** Status-through-obligations fixture kit (non-car names). */
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
  const page = (id, status) => {
    if (status === 'notApplicable') {
      return { kind: 'page', id }
    }
    return {
      kind: 'page',
      id,
      presents: [
        ob(`${id}-main`, {
          status: 'mandatory',
          fulfilled: status === 'fulfilled'
        })
      ]
    }
  }
  const evaluation = () => ({
    obligations: Object.fromEntries(entries),
    fulfilments: {},
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

describe('flow-eval/navigation/section-entry', () => {
  it('pins the two modes', () => {
    expect(SECTION_ENTRY_MODES).toEqual([
      'firstApplicablePage',
      'firstUnfulfilledPage'
    ])
  })

  it('defaults to firstApplicablePage when neither Flow nor Section declares a mode', () => {
    const { page, evaluation } = kit()
    const section = group('who', [
      page('intro', 'notApplicable'),
      page('a', 'fulfilled')
    ])
    const flow = { sections: [section] }
    expect(sectionEntry(flow, section, evaluation())?.id).toBe('intro')
  })

  it('follows the Flow-level sectionEntryMode', () => {
    const { page, evaluation } = kit()
    const section = group('who', [
      page('a', 'fulfilled'),
      page('b', 'notStarted')
    ])
    const flow = {
      sectionEntryMode: 'firstUnfulfilledPage',
      sections: [section]
    }
    expect(sectionEntry(flow, section, evaluation())?.id).toBe('b')
  })

  it('lets a per-Section entryMode override the Flow default', () => {
    const { page, evaluation } = kit()
    const section = group(
      'who',
      [page('a', 'fulfilled'), page('b', 'notStarted')],
      {
        entryMode: 'firstApplicablePage'
      }
    )
    const flow = {
      sectionEntryMode: 'firstUnfulfilledPage',
      sections: [section]
    }
    expect(sectionEntry(flow, section, evaluation())?.id).toBe('a')
  })

  it('degrades a fully-Fulfilled Section to first-Page behaviour in unfulfilled mode', () => {
    const { page, evaluation } = kit()
    const section = group('who', [
      page('a', 'fulfilled'),
      page('b', 'fulfilled')
    ])
    const flow = {
      sectionEntryMode: 'firstUnfulfilledPage',
      sections: [section]
    }
    expect(sectionEntry(flow, section, evaluation())?.id).toBe('a')
  })

  it('throws loudly on an unknown mode, wherever it is declared', () => {
    const { page, evaluation } = kit()
    const section = group('who', [page('a', 'notStarted')])
    expect(() =>
      sectionEntry(
        { sectionEntryMode: 'teleport', sections: [section] },
        section,
        evaluation()
      )
    ).toThrow('Unknown section entry mode "teleport"')
    expect(() =>
      sectionEntry(
        { sections: [section] },
        { ...section, entryMode: 'teleport' },
        evaluation()
      )
    ).toThrow('Unknown section entry mode "teleport"')
  })
})
