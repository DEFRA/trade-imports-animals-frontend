import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { createFlowConditionRegistry } from './applies-when.js'
import {
  containerStatus,
  rollUpChildStatuses,
  CONTAINER_STATUSES
} from './container-status.js'
import { evaluateObligations } from '../engine/evaluate.js'
import { loadJourneyModel } from '../engine/load-model.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const flow = JSON.parse(
  fs.readFileSync(path.join(dirname, '../model/flow.json'), 'utf8')
)

const ob = (name, over = {}) => [
  name,
  {
    name,
    inScope: true,
    status: 'optional',
    reasons: [],
    fulfilled: false,
    ...over
  }
]

const evaluationOf = (entries, fulfilments = {}) => ({
  obligations: Object.fromEntries(entries),
  fulfilments,
  drops: []
})

const page = (id, presents, over = {}) => ({
  kind: 'page',
  id,
  presents,
  ...over
})

describe('flow-eval/container-status — the seven-row truth table', () => {
  it('exposes exactly the four statuses, no fifth', () => {
    expect(CONTAINER_STATUSES).toEqual([
      'notApplicable',
      'notStarted',
      'inProgress',
      'fulfilled'
    ])
  })

  it.each([
    [['fulfilled'], 'fulfilled'],
    [['notStarted'], 'notStarted'],
    [['inProgress'], 'inProgress'],
    [['fulfilled', 'notStarted'], 'inProgress'],
    [['fulfilled', 'inProgress'], 'inProgress'],
    [['inProgress', 'notStarted'], 'inProgress'],
    [['fulfilled', 'inProgress', 'notStarted'], 'inProgress']
  ])('rolls %j up to %s', (children, expected) => {
    expect(rollUpChildStatuses(children)).toBe(expected)
  })

  it('filters Not Applicable out before rolling up', () => {
    expect(rollUpChildStatuses(['notApplicable', 'fulfilled'])).toBe(
      'fulfilled'
    )
    expect(rollUpChildStatuses(['notApplicable', 'notStarted'])).toBe(
      'notStarted'
    )
    expect(rollUpChildStatuses(['notApplicable'])).toBe('notApplicable')
    expect(rollUpChildStatuses([])).toBe('notApplicable')
  })
})

describe('flow-eval/container-status — Page leaf rule', () => {
  it('reads a read-only Page as Not Applicable', () => {
    expect(containerStatus(page('intro', undefined), evaluationOf([]))).toBe(
      'notApplicable'
    )
  })

  it('reads a Page whose presented obligations are all out of scope as Not Applicable', () => {
    const evaluation = evaluationOf([
      ob('sheddingConsent', { inScope: false, status: undefined })
    ])
    expect(
      containerStatus(
        page('shed', [{ obligation: 'sheddingConsent' }]),
        evaluation
      )
    ).toBe('notApplicable')
  })

  it('reads an optional-only Page as Not Applicable (provisional pick)', () => {
    const evaluation = evaluationOf([ob('contactEmail', { fulfilled: true })])
    expect(
      containerStatus(
        page('contact', [{ obligation: 'contactEmail' }]),
        evaluation
      )
    ).toBe('notApplicable')
  })

  it('walks Not Started -> In Progress -> Fulfilled with mandatory and optional mixed', () => {
    const target = page('applicant', [
      { obligation: 'applicantName', mandate: 'hard' },
      { obligation: 'contactEmail' }
    ])
    const untouched = evaluationOf([
      ob('applicantName', { status: 'mandatory' }),
      ob('contactEmail')
    ])
    const optionalOnly = evaluationOf([
      ob('applicantName', { status: 'mandatory' }),
      ob('contactEmail', { fulfilled: true })
    ])
    const done = evaluationOf([
      ob('applicantName', { status: 'mandatory', fulfilled: true }),
      ob('contactEmail')
    ])
    expect(containerStatus(target, untouched)).toBe('notStarted')
    expect(containerStatus(target, optionalOnly)).toBe('inProgress')
    expect(containerStatus(target, done)).toBe('fulfilled')
  })

  it('reads an in-scope mandatory but empty collection as Not Started', () => {
    const evaluation = evaluationOf([
      ob('hiveLocation', { status: 'mandatory', fulfilments: [] })
    ])
    const target = page('hives', undefined, {
      presentsForEach: [{ obligation: 'hiveLocation', fulfilment: '*' }]
    })
    expect(containerStatus(target, evaluation)).toBe('notStarted')
  })
})

describe('flow-eval/container-status — gating and recursion (non-car tree)', () => {
  const conditions = createFlowConditionRegistry()
  conditions.define(
    'keepsBees',
    ({ fulfilments }) => fulfilments.keepsBees?.value === 'yes'
  )

  const tree = {
    kind: 'group',
    id: 'allotment',
    children: [
      page('applicant', [{ obligation: 'applicantName' }]),
      {
        kind: 'group',
        id: 'livestock',
        appliesWhen: 'keepsBees',
        children: [
          page('hives', [{ obligation: 'hiveLocation' }]),
          page('site-notes', undefined)
        ]
      }
    ]
  }

  const entries = (over = {}) => [
    ob('applicantName', { status: 'mandatory', ...over }),
    ob('hiveLocation', { status: 'mandatory' })
  ]

  it('reads a gated-out Group as Not Applicable regardless of its contents', () => {
    expect(
      containerStatus(tree.children[1], evaluationOf(entries()), { conditions })
    ).toBe('notApplicable')
  })

  it('rolls a gated-in Group up from its applicable children', () => {
    const evaluation = evaluationOf(entries(), { keepsBees: { value: 'yes' } })
    expect(containerStatus(tree.children[1], evaluation, { conditions })).toBe(
      'notStarted'
    )
    expect(containerStatus(tree, evaluation, { conditions })).toBe('notStarted')
  })

  it('mixes a Fulfilled child with a Not Started one to In Progress', () => {
    const evaluation = evaluationOf(entries({ fulfilled: true }), {
      keepsBees: { value: 'yes' }
    })
    expect(containerStatus(tree, evaluation, { conditions })).toBe('inProgress')
  })
})

describe('flow-eval/container-status — over the real model and Flow', () => {
  const { obligations } = loadJourneyModel()
  const sectionById = new Map(
    flow.sections.map((section) => [section.id, section])
  )
  const id = (name) => obligations.find((record) => record.name === name).id
  const state = (values) =>
    Object.fromEntries(
      Object.entries(values).map(([name, value]) => [id(name), { value }])
    )

  it('starts every real Section Not Started except the gated quote Section', () => {
    const empty = evaluateObligations(obligations, {})
    expect(containerStatus(sectionById.get('email'), empty)).toBe('notStarted')
    expect(
      containerStatus(sectionById.get('your-driving-and-cover'), empty)
    ).toBe('notStarted')
    expect(containerStatus(sectionById.get('get-your-quote'), empty)).toBe(
      'notApplicable'
    )
  })

  it('keeps the driving Section In Progress while claims are mandatory and empty', () => {
    const evaluation = evaluateObligations(
      obligations,
      state({
        yearsNoClaims: '5',
        hadClaims: 'yes',
        coverType: 'comprehensive',
        extras: []
      })
    )
    const driving = sectionById.get('your-driving-and-cover')
    const claimsPage = driving.children.find((child) => child.id === 'claims')
    expect(containerStatus(claimsPage, evaluation)).toBe('notStarted')
    expect(containerStatus(driving, evaluation)).toBe('inProgress')
  })

  it('fulfils every applicable Section on the no-claims happy path', () => {
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
    for (const sectionId of [
      'email',
      'about-you-and-your-vehicle',
      'your-driving-and-cover',
      'add-to-your-policy'
    ]) {
      expect(containerStatus(sectionById.get(sectionId), evaluation)).toBe(
        'fulfilled'
      )
    }
    // quoteReady now gates the quote Section IN, but its only page is
    // optional-only (premium) so the Section still reads Not Applicable.
    expect(containerStatus(sectionById.get('get-your-quote'), evaluation)).toBe(
      'notApplicable'
    )
  })
})
