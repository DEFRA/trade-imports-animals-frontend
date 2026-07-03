import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

/**
 * Pins BOTH Flows: referential integrity against the obligations catalogue,
 * the exact page-hard mandate set {fullName} (Rulings item 3 — every other
 * parity required_at_save field is page-soft, engine-mandatory at CYA POST),
 * tree shape, the closed appliesWhen name list, pinned parity copy, and the
 * flow<->skeleton equivalence of presented obligation sets.
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))
const load = (file) =>
  JSON.parse(fs.readFileSync(path.join(dirname, file), 'utf8'))

const { obligations } = load('obligations.json')
const flow = load('flow.json')
const skeleton = load('skeleton-flow.json')

const obligationIds = new Set(obligations.map((record) => record.id))
const byName = new Map(obligations.map((record) => [record.name, record]))
const byId = new Map(obligations.map((record) => [record.id, record]))

const walk = (containers, visit) => {
  for (const container of containers) {
    visit(container)
    if (container.kind === 'group') {
      walk(container.children, visit)
    }
  }
}

const pagesOf = (aFlow) => {
  const pages = []
  walk(
    aFlow.sections,
    (container) => container.kind === 'page' && pages.push(container)
  )
  return pages
}

const entriesOf = (page) => [
  ...(page.presents ?? []),
  ...(page.presentsForEach ?? [])
]

const allEntries = (aFlow) => pagesOf(aFlow).flatMap(entriesOf)

const appliesWhenNames = (aFlow) => {
  const names = new Set()
  walk(
    aFlow.sections,
    (container) => container.appliesWhen && names.add(container.appliesWhen)
  )
  return names
}

describe.each([
  ['flow.json', flow],
  ['skeleton-flow.json', skeleton]
])('model/%s — integrity', (label, aFlow) => {
  it('references only real obligation ids from presents/presentsForEach', () => {
    for (const entry of allEntries(aFlow)) {
      expect(obligationIds).toContain(entry.obligation)
    }
  })

  it('hard-mandates fullName and NOTHING else (Rulings item 3)', () => {
    const mandated = allEntries(aFlow).filter((entry) => entry.mandate)
    expect(mandated.map((entry) => entry.mandate)).toEqual(['hard'])
    expect(mandated.map((entry) => entry.obligation)).toEqual([
      byName.get('fullName').id
    ])
  })

  it('matches entry shape to cardinality: presents=single, presentsForEach=indexed', () => {
    for (const page of pagesOf(aFlow)) {
      for (const entry of page.presents ?? []) {
        expect(byId.get(entry.obligation).cardinality).toBe('single')
      }
      for (const entry of page.presentsForEach ?? []) {
        expect(byId.get(entry.obligation).cardinality).toBe('indexed')
        expect(entry.fulfilment).toBe('*')
      }
    }
  })

  it('keeps page ids and slugs unique, with CYA/confirmation outside the tree', () => {
    const pages = pagesOf(aFlow)
    expect(new Set(pages.map((page) => page.id)).size).toBe(pages.length)
    expect(new Set(pages.map((page) => page.slug)).size).toBe(pages.length)
    for (const page of pages) {
      expect(['check-your-answers', 'confirmation']).not.toContain(page.slug)
      expect(
        (page.presents?.length ?? 0) + (page.presentsForEach?.length ?? 0)
      ).toBeGreaterThan(0)
    }
  })
})

describe('model/flow.json — the polished Flow', () => {
  it('declares the five pinned Sections in hub order', () => {
    expect(flow.sections.map((section) => section.id)).toEqual([
      'email',
      'about-you-and-your-vehicle',
      'your-driving-and-cover',
      'add-to-your-policy',
      'get-your-quote'
    ])
    for (const section of flow.sections) {
      expect(section.kind).toBe('group')
    }
  })

  it('uses the closed appliesWhen name list (gating is named Flow conditions)', () => {
    const closed = [
      'addonSelected:modifications',
      'addonSelected:named-driver',
      'addonSelected:protected-ncd',
      'hadClaimsIsYes',
      'quoteReady'
    ]
    expect([...appliesWhenNames(flow)].sort()).toEqual(closed)
    expect([...appliesWhenNames(skeleton)].sort()).toEqual(closed)
  })

  it('routes the twelve question pages through the generic page template', () => {
    const templates = pagesOf(flow).map((page) => page.template)
    expect(templates.filter((template) => template === 'page')).toHaveLength(12)
    expect(
      templates.filter((template) => template === 'claims-list')
    ).toHaveLength(1)
    expect(
      templates.filter((template) => template === 'quote-summary')
    ).toHaveLength(1)
  })

  it('spot-checks the pinned parity copy', () => {
    const page = (id) => pagesOf(flow).find((candidate) => candidate.id === id)
    expect(flow.hub.heading).toBe('Get a car insurance quote')
    expect(flow.start.buttonText).toBe('Start now')
    expect(flow.defaults.saveButtonText).toBe('Save and continue')
    expect(page('email').heading).toBe('Give us your email to begin')
    expect(page('about-you').heading).toBe('About you')
    expect(page('about-you').presents[0].label).toBe('Full name')
    expect(page('cover-type').presents[0].label).toBe(
      'Which cover do you want?'
    )
    expect(page('quote-summary').heading).toBe('Your quote')
    expect(page('quote-summary').buttonText).toBe('Accept and continue')
    expect(flow.checkYourAnswers.heading).toBe('Check your answers')
    expect(flow.checkYourAnswers.buttonText).toBe('Accept and get quote')
    expect(flow.checkYourAnswers.bannerHeading).toBe(
      'You still need to complete some sections'
    )
    expect(flow.confirmation.panelTitle).toBe('Quote confirmed')
  })

  it('distinguishes the three claims buttons (manage-list parity trap)', () => {
    const claims = pagesOf(flow).find((page) => page.id === 'claims')
    expect(claims.heading).toBe('Claims you have added')
    expect(claims.title).toBe('Your claims')
    expect(claims.listCopy.addButtonText).toBe('Add a claim')
    expect(claims.listCopy.addAnotherButtonText).toBe('Add another claim')
    expect(claims.addPage.buttonText).toBe('Add claim')
  })

  it('pins the excessAmount conditional reveal under the voluntaryExcess Yes', () => {
    const coverType = pagesOf(flow).find((page) => page.id === 'cover-type')
    const excess = coverType.presents.find(
      (entry) => entry.obligation === byName.get('excessAmount').id
    )
    expect(excess.revealedBy).toEqual({
      obligation: byName.get('voluntaryExcess').id,
      value: 'yes'
    })
  })
})

describe('flow <-> skeleton equivalence (the cross-Flow fixture contract)', () => {
  it('presents the same obligation set — all 30 — in both Flows', () => {
    const presented = (aFlow) =>
      [...new Set(allEntries(aFlow).map((entry) => entry.obligation))].sort()
    expect(presented(skeleton)).toEqual(presented(flow))
    expect(presented(flow)).toEqual([...obligationIds].sort())
  })

  it('keeps the skeleton single-Section with a deliberately different entry mode', () => {
    expect(skeleton.sections).toHaveLength(1)
    expect(
      skeleton.sections[0].children.every((child) => child.kind === 'page')
    ).toBe(true)
    expect(flow.sectionEntryMode).toBe('firstApplicablePage')
    expect(skeleton.sectionEntryMode).toBe('firstUnfulfilledPage')
    expect(skeleton.service).toBe(flow.service)
  })
})
