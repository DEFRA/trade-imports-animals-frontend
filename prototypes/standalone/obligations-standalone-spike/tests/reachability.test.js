import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Tier 1 — static reachability (TEST-1/6/15). A pure JSON walk over the
 * catalogue and BOTH Flows: no engine, no rendering. Every obligation
 * must be presented by at least one Page in each Flow, every Flow
 * reference must resolve into the catalogue, and appliesWhen names stay
 * inside the closed list the journey condition registry covers.
 */

const modelDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'model'
)
const readModel = (file) =>
  JSON.parse(fs.readFileSync(path.join(modelDir, file), 'utf8'))

const { obligations } = readModel('obligations.json')
const flows = [
  ['flow.json', readModel('flow.json')],
  ['skeleton-flow.json', readModel('skeleton-flow.json')]
]

const catalogueIds = new Set(obligations.map((record) => record.id))

const collectPages = (container) =>
  container.kind === 'page'
    ? [container]
    : (container.sections ?? container.children ?? []).flatMap(collectPages)

const collectAppliesWhen = (container) => [
  ...(container.appliesWhen ? [container.appliesWhen] : []),
  ...(container.sections ?? container.children ?? []).flatMap(
    collectAppliesWhen
  )
]

const entriesOf = (page) => [
  ...(page.presents ?? []),
  ...(page.presentsForEach ?? [])
]

describe.each(flows)('tests/reachability — %s', (name, flow) => {
  const pages = collectPages(flow)

  it('presents every catalogue obligation on at least one page', () => {
    const presented = new Set(
      pages.flatMap((page) => entriesOf(page).map((entry) => entry.obligation))
    )
    const unreachable = obligations
      .filter((record) => !presented.has(record.id))
      .map((record) => record.name)
    expect(unreachable).toEqual([])
  })

  it('has no dangling obligation references', () => {
    const dangling = pages
      .flatMap((page) => entriesOf(page))
      .map((entry) => entry.obligation)
      .filter((id) => !catalogueIds.has(id))
    expect(dangling).toEqual([])
  })

  it('keeps every appliesWhen name inside the closed journey list', () => {
    const known = /^(hadClaimsIsYes|quoteReady|addonSelected:.+)$/
    for (const conditionName of collectAppliesWhen(flow)) {
      expect(conditionName).toMatch(known)
    }
  })

  it('never reuses a page id or slug', () => {
    const ids = pages.map((page) => page.id)
    const slugs = pages.map((page) => page.slug)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('anchors every revealedBy to an obligation presented on the same page', () => {
    for (const page of pages) {
      for (const entry of entriesOf(page)) {
        if (!entry.revealedBy) {
          continue
        }
        const siblings = entriesOf(page).map((sibling) => sibling.obligation)
        expect(siblings).toContain(entry.revealedBy.obligation)
      }
    }
  })
})

describe('tests/reachability — catalogue cross-references', () => {
  it('resolves every controllingObligation to a catalogue id', () => {
    for (const record of obligations) {
      const controller = record.indexedBy?.controllingObligation
      if (controller) {
        expect(catalogueIds.has(controller)).toBe(true)
      }
    }
  })

  it('presents the same obligation set in both flows', () => {
    const presentedIn = (flow) =>
      new Set(
        collectPages(flow).flatMap((page) =>
          entriesOf(page).map((entry) => entry.obligation)
        )
      )
    const [[, firstFlow], [, secondFlow]] = flows
    expect([...presentedIn(firstFlow)].sort()).toEqual(
      [...presentedIn(secondFlow)].sort()
    )
  })
})
