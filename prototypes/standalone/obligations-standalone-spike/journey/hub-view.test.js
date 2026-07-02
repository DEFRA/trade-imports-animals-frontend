import { describe, expect, it } from 'vitest'
import { evaluate, journeyFlow, journeyModel } from '../contract/status.js'
import { createJourneyRepository } from '../store/index.js'
import { hubViewModel } from './hub-view.js'
import { pagePath } from './paths.js'

const { identifiers } = journeyModel()

/** Indexed obligations are passed pre-shaped ({ fid: { value } }). */
const evaluationWith = (values = {}) => {
  const repository = createJourneyRepository()
  const created = repository.create(journeyFlow().id)
  const fulfilments = Object.fromEntries(
    Object.entries(values).map(([name, value]) => {
      const record = identifiers.recordOfName(name)
      return [record.id, record.cardinality === 'indexed' ? value : { value }]
    })
  )
  return evaluate(repository.saveFulfilments(created.journeyId, fulfilments))
}

/** The engine-mandatory set satisfied — journeyState Fulfilled. */
const COMPLETE = {
  email: 'sam@example.com',
  fullName: 'Alex Driver',
  registration: 'AB12CDE',
  hadClaims: 'no',
  coverType: 'comprehensive',
  extras: [],
  addons: []
}

const titles = (view) => view.items.map((item) => item.title.text)
const itemByTitle = (view, title) =>
  view.items.find((item) => item.title.text === title)

describe('journey/hub-view — the fresh hub (spike-a row set)', () => {
  const view = hubViewModel(evaluationWith())

  it('renders the pinned rows in order, no CYA row, no add-on rows', () => {
    expect(titles(view)).toEqual([
      'Email',
      'About you and your vehicle',
      'Your driving and cover',
      'Add to your policy',
      'Get your quote'
    ])
  })

  it('makes every group row an always-live link with page-title hints', () => {
    expect(itemByTitle(view, 'Email')).toMatchObject({
      hint: { text: 'Give us your email to begin' },
      href: pagePath('email'),
      status: { tag: { text: 'Not started', classes: 'govuk-tag--grey' } }
    })
    expect(itemByTitle(view, 'About you and your vehicle')).toMatchObject({
      hint: { text: 'About you, Your vehicle' },
      href: pagePath('about-you')
    })
    expect(itemByTitle(view, 'Add to your policy')).toMatchObject({
      href: pagePath('addons'),
      status: { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
    })
  })

  it('drops the Not Applicable claims page from the driving hint', () => {
    expect(itemByTitle(view, 'Your driving and cover').hint.text).toBe(
      'Driving history, Choose your cover, Optional extras'
    )
  })

  it('shows Get your quote inert: no link, plain Cannot start yet', () => {
    const quote = itemByTitle(view, 'Get your quote')
    expect(quote.href).toBeUndefined()
    expect(quote.status).toEqual({
      text: 'Cannot start yet',
      classes: 'govuk-task-list__status--cannot-start-yet'
    })
  })

  it('carries the heading and the 0-of-3 progress line', () => {
    expect(view.heading).toBe('Get a car insurance quote')
    expect(view.progressLine).toBe('You have completed 0 of 3 tasks.')
    expect(view.completedCount).toBe(0)
    expect(view.totalCount).toBe(3)
  })
})

describe('journey/hub-view — statuses follow the evaluation', () => {
  it('marks a fulfilled group Completed and counts it', () => {
    const view = hubViewModel(evaluationWith({ email: 'sam@example.com' }))
    expect(itemByTitle(view, 'Email').status).toEqual({ text: 'Completed' })
    expect(view.progressLine).toBe('You have completed 1 of 3 tasks.')
  })

  it('marks a part-answered group In progress (light blue)', () => {
    const view = hubViewModel(evaluationWith({ fullName: 'Alex Driver' }))
    expect(itemByTitle(view, 'About you and your vehicle').status).toEqual({
      tag: { text: 'In progress', classes: 'govuk-tag--light-blue' }
    })
  })

  it('returns the claims page to the driving hint once in scope', () => {
    const view = hubViewModel(evaluationWith({ hadClaims: 'yes' }))
    expect(itemByTitle(view, 'Your driving and cover').hint.text).toBe(
      'Driving history, Your claims, Choose your cover, Optional extras'
    )
  })
})

describe('journey/hub-view — add-on rows (per-section visibility)', () => {
  it('adds one Incomplete row per selected add-on, linking its first page', () => {
    const view = hubViewModel(evaluationWith({ addons: ['named-driver'] }))
    expect(titles(view)).toContain('Add a named driver')
    expect(titles(view)).not.toContain('Declare vehicle modifications')
    expect(itemByTitle(view, 'Add a named driver')).toMatchObject({
      hint: { text: 'Named driver, Relationship to you' },
      href: pagePath('addons/named-driver/who'),
      status: { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
    })
  })

  it('marks a finished add-on Completed', () => {
    const view = hubViewModel(
      evaluationWith({
        addons: ['protected-ncd'],
        ncdYears: { 'protected-ncd': { value: '5' } }
      })
    )
    expect(itemByTitle(view, 'Protect your no-claims discount').status).toEqual(
      { text: 'Completed' }
    )
  })
})

describe('journey/hub-view — the Get your quote gate (parity ruling c)', () => {
  it('goes live with a blue Not started tag once the journey is Fulfilled', () => {
    const view = hubViewModel(evaluationWith(COMPLETE))
    expect(view.completedCount).toBe(3)
    expect(itemByTitle(view, 'Get your quote')).toMatchObject({
      href: pagePath('quote-summary'),
      status: { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
    })
  })

  it('na-hide (doc default, unit-only) would never surface the row', () => {
    // The quote page presents only the engine-optional premium, so its
    // Section rolls up Not Applicable even when quoteReady — the doc
    // default hides it always, which is why the shipped mode deviates.
    const fresh = hubViewModel(evaluationWith(), { quoteRowMode: 'na-hide' })
    expect(titles(fresh)).not.toContain('Get your quote')
    const done = hubViewModel(evaluationWith(COMPLETE), {
      quoteRowMode: 'na-hide'
    })
    expect(titles(done)).not.toContain('Get your quote')
  })
})
