import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkSave } from '../contract/index.js'
import { loadJourneyModel } from '../engine/index.js'
import {
  errorSummaryLinks,
  errorWiring,
  extractInputs
} from './helpers/extract-inputs.js'
import {
  evaluationFor,
  readStateFixture,
  renderClaimsAdd,
  renderFlowPage
} from './helpers/render-page.js'

/**
 * Tier 2 — model<->template alignment per Page via the REAL projection
 * (TEST-2/7..12, FLOW-12): fixture journey -> contract view-model ->
 * nunjucks render -> regex extraction, then both directions must line up
 * with the model. Hard-mandate strict failure and the GDS a11y error
 * wiring ride the same walk.
 */

const flow = JSON.parse(
  fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'model',
      'flow.json'
    ),
    'utf8'
  )
)
const { identifiers } = loadJourneyModel()

const collectPages = (container, pages = []) => {
  if (container.kind === 'page') {
    pages.push(container)
    return pages
  }
  for (const child of container.sections ?? container.children ?? []) {
    collectPages(child, pages)
  }
  return pages
}

const pages = collectPages(flow)
const genericPages = pages.filter((page) => page.template === 'page')

// claims-in-scope puts every conditional page's slots on screen.
const evaluation = evaluationFor(readStateFixture('claims-in-scope.json'))
const emptyEvaluation = evaluationFor(readStateFixture('empty-journey.json'))

const KIND_BY_TYPE = {
  text: 'input',
  email: 'input',
  tel: 'input',
  number: 'input',
  currency: 'input',
  formatted: 'input',
  textarea: 'textarea',
  date: 'date',
  file: 'file',
  radio: 'radios',
  boolean: 'radios',
  'multi-select': 'checkboxes',
  select: 'select'
}

/** The controls the model says a page must render, one per concrete slot. */
const expectedControls = (page) => {
  const expected = []
  for (const entry of page.presents ?? []) {
    const record = identifiers.recordOfId(entry.obligation)
    if (!record.handler) {
      expected.push({ record, inputName: record.name })
    }
  }
  for (const entry of page.presentsForEach ?? []) {
    const record = identifiers.recordOfId(entry.obligation)
    for (const fulfilment of evaluation.obligations[entry.obligation]
      .fulfilments) {
      expected.push({
        record,
        inputName: `${record.name}__${encodeURIComponent(fulfilment.fulfilmentId)}`
      })
    }
  }
  return expected
}

describe.each(genericPages.map((page) => [page.id, page]))(
  'tests/alignment-walker — page %s',
  (pageId, page) => {
    const { html } = renderFlowPage(pageId, evaluation)
    const controls = extractInputs(html)
    const byName = new Map(controls.map((control) => [control.name, control]))
    const expected = expectedControls(page)

    it('renders one control of the right kind per declared slot (forward)', () => {
      expect(expected.length).toBeGreaterThan(0)
      for (const { record, inputName } of expected) {
        const control = byName.get(inputName)
        expect(control, `missing control "${inputName}"`).toBeDefined()
        expect(control.kind, `kind of "${inputName}"`).toBe(
          KIND_BY_TYPE[record.type]
        )
      }
    })

    it('renders no control the model does not declare (reverse)', () => {
      const declared = new Set(expected.map((slot) => slot.inputName))
      expect(
        controls
          .map((control) => control.name)
          .filter((name) => !declared.has(name))
      ).toEqual([])
    })

    it('aligns choice-control option values with the record domain', () => {
      for (const { record, inputName } of expected) {
        const control = byName.get(inputName)
        if (record.type === 'boolean') {
          expect(control.values).toEqual(['yes', 'no'])
        } else if (record.type === 'radio' || record.type === 'multi-select') {
          expect(control.values, inputName).toEqual(record.options)
        } else if (record.type === 'select') {
          expect(control.options, inputName).toEqual(['', ...record.options])
        } else if (record.type === 'email' || record.type === 'tel') {
          expect(control.inputType, inputName).toBe(record.type)
        }
      }
    })

    it('never emits a required attribute (server-side round trips only)', () => {
      expect(html).not.toMatch(/<[^>]*\srequired[\s>]/)
    })
  }
)

describe('tests/alignment-walker — mandates and error wiring', () => {
  it('blocks an empty save on exactly the pages declaring a hard mandate', () => {
    const blocked = genericPages
      .filter((page) => !checkSave(page.id, {}, emptyEvaluation).ok)
      .map((page) => page.id)
    expect(blocked).toEqual(['about-you'])
  })

  it('wires the blocked save into GDS error markup, fullName only', () => {
    const { fieldErrors, errorSummary } = checkSave(
      'about-you',
      {},
      emptyEvaluation
    )
    expect(Object.keys(fieldErrors)).toEqual(['fullName'])
    const { html } = renderFlowPage('about-you', emptyEvaluation, {
      fieldErrors,
      errorSummary
    })
    expect(errorSummaryLinks(html)).toEqual(['#fullName'])
    expect(errorWiring(html, 'fullName')).toEqual({
      hasErrorMessage: true,
      inputDescribedBy: true
    })
  })
})

describe('tests/alignment-walker — bespoke and system pages', () => {
  it('renders the claims add form controls straight from the model', () => {
    const claimsPage = pages.find((page) => page.id === 'claims')
    const { html } = renderClaimsAdd(claimsPage)
    const controls = extractInputs(html)
    expect(controls).toEqual([
      {
        name: 'claimType',
        kind: 'radios',
        values: ['accident', 'theft', 'windscreen', 'other']
      },
      expect.objectContaining({ name: 'claimAmount', kind: 'input' })
    ])
  })

  it('projects zero user-facing inputs for the system-handled quote page', () => {
    const { html, viewModel } = renderFlowPage('quote-summary', evaluation)
    expect(viewModel.fields).toEqual([])
    expect(extractInputs(html)).toEqual([])
  })

  it('covers every page in the Flow', () => {
    const handled = new Set([
      ...genericPages.map((page) => page.id),
      'claims',
      'quote-summary'
    ])
    expect(
      pages.map((page) => page.id).filter((id) => !handled.has(id))
    ).toEqual([])
  })
})
