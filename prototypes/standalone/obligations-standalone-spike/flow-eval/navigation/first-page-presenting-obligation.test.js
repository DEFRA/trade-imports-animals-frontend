import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { firstPagePresentingObligation } from './first-page-presenting-obligation.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const flow = JSON.parse(
  fs.readFileSync(path.join(dirname, '../../model/flow.json'), 'utf8')
)
const { obligations } = JSON.parse(
  fs.readFileSync(path.join(dirname, '../../model/obligations.json'), 'utf8')
)
const idOf = (name) => obligations.find((record) => record.name === name).id

const page = (id, entries) => ({ kind: 'page', id, ...entries })
const group = (id, children, over = {}) => ({
  kind: 'group',
  id,
  children,
  ...over
})

describe('flow-eval/navigation/first-page-presenting-obligation', () => {
  const tree = group('allotment', [
    page('intro', {}),
    page('applicant', { presents: [{ obligation: 'applicantName' }] }),
    group('livestock', [
      page('hives', {
        appliesWhen: 'keepsBees',
        presentsForEach: [{ obligation: 'hiveLocation', fulfilment: '*' }]
      }),
      page('hive-review', { presents: [{ obligation: 'hiveLocation' }] })
    ])
  ])

  it('finds a single presenting Page', () => {
    expect(firstPagePresentingObligation(tree, 'applicantName')?.id).toBe(
      'applicant'
    )
  })

  it('returns the first of multiple matches in depth-first order', () => {
    expect(firstPagePresentingObligation(tree, 'hiveLocation')?.id).toBe(
      'hives'
    )
  })

  it('matches presentsForEach entries and nested deep Pages', () => {
    const nested = group('outer', [group('inner', [tree.children[2]])])
    expect(firstPagePresentingObligation(nested, 'hiveLocation')?.id).toBe(
      'hives'
    )
  })

  it('is structural — appliesWhen gating never filters the walk', () => {
    // 'hives' is gated but still wins: Change links resolve structurally.
    expect(firstPagePresentingObligation(tree, 'hiveLocation')?.id).toBe(
      'hives'
    )
  })

  it('returns null defensively when no Page presents the obligation', () => {
    expect(firstPagePresentingObligation(tree, 'ghost')).toBeNull()
  })

  it('resolves real CYA Change targets over model/flow.json', () => {
    const flowRoot = { sections: flow.sections }
    expect(firstPagePresentingObligation(flowRoot, idOf('fullName'))?.id).toBe(
      'about-you'
    )
    expect(firstPagePresentingObligation(flowRoot, idOf('claimType'))?.id).toBe(
      'claims'
    )
    expect(firstPagePresentingObligation(flowRoot, idOf('hadClaims'))?.id).toBe(
      'driving-history'
    )
  })
})
