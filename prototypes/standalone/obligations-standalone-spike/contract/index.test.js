import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import * as contract from './index.js'
import { createJourneyRepository } from '../store/index.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const modelFile = (file) =>
  fs.readFileSync(path.join(dirname, '..', 'model', file), 'utf8')

/** The pinned 16-item surface as 21 exports (TOOL-21) — sorted. */
const SURFACE = [
  'addFulfilment',
  'applyAnswers',
  'canSubmit',
  'changeTarget',
  'checkSave',
  'cyaRows',
  'evaluate',
  'firstApplicablePage',
  'firstPagePresentingObligation',
  'firstUnfulfilledPage',
  'guardPage',
  'hubViewModel',
  'journeyState',
  'markCollectionReviewed',
  'modelJson',
  'nextAfter',
  'pageViewModel',
  'removeFulfilment',
  'resolveReasons',
  'sectionEntry',
  'submit'
]

describe('contract/index — the 21-export barrel', () => {
  it('pins the surface: exactly 21 exports, no drift', () => {
    const exported = Object.keys(contract).sort()
    expect(exported).toHaveLength(21)
    expect(exported).toEqual([...SURFACE].sort())
  })

  it('serves both model files verbatim for interrogation Level 3', () => {
    const { obligations, flow } = contract.modelJson()
    expect(obligations).toBe(modelFile('obligations.json'))
    expect(flow).toBe(modelFile('flow.json'))
    expect(() => JSON.parse(obligations)).not.toThrow()
  })

  it('drives a whole journey through the barrel alone (the REPL smoke)', () => {
    const repository = createJourneyRepository()
    const options = { repository }
    let journey = repository.create('car-insurance-quote-flow')

    // Mid-journey: open CYA data with soft prompts, submit gated.
    let evaluation = contract.evaluate(journey)
    expect(contract.journeyState(evaluation)).toBe('notStarted')
    expect(contract.canSubmit(evaluation)).toBe(false)
    expect(contract.cyaRows(evaluation).prompts.length).toBeGreaterThan(0)

    // The one page-hard mandate blocks a blank save; soft fields do not.
    expect(contract.checkSave('about-you', {}, evaluation).ok).toBe(false)
    expect(contract.checkSave('email', {}, evaluation).ok).toBe(true)
    expect(contract.nextAfter('about-you', evaluation)).toContain(
      'your-vehicle'
    )
    expect(contract.changeTarget('hadClaims')).toContain('?change=1')

    // Answer every task through the mutation surface.
    const pages = [
      ['email', { email: 'sam@example.com' }],
      ['about-you', { fullName: 'Alex Driver' }],
      ['your-vehicle', { registration: 'AB12CDE' }],
      ['driving-history', { hadClaims: 'yes' }],
      ['cover-type', { coverType: 'comprehensive', voluntaryExcess: 'no' }],
      ['optional-extras', {}],
      ['addons', {}]
    ]
    for (const [pageId, payload] of pages) {
      ;({ journey } = contract.applyAnswers(journey, pageId, payload, options))
    }
    const added = contract.addFulfilment(
      journey,
      ['claimType', 'claimAmount'],
      { claimType: 'theft', claimAmount: '450' },
      options
    )
    journey = added.journey
    evaluation = added.evaluation
    expect(contract.canSubmit(evaluation)).toBe(true)

    // Submit flips one-way; the guard then resolves the hub to CYA.
    const submitted = contract.submit(journey, options)
    expect(submitted.ok).toBe(true)
    expect(submitted.reference).toMatch(/^CI-[0-9A-F]{6}$/)
    const frozen = submitted.evaluation
    expect(contract.guardPage({ surface: 'hub' }, frozen)).toContain(
      'check-your-answers'
    )
    expect(
      contract.guardPage({ surface: 'check-your-answers' }, frozen)
    ).toBeNull()
    const readOnly = contract.cyaRows(frozen)
    expect(readOnly.rows.every((row) => row.actions === undefined)).toBe(true)
  })
})
