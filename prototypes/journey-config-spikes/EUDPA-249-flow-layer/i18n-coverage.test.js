/**
 * i18n coverage — walk every message key referenced from the flow
 * declaration + the presentation manifest and assert each resolves in
 * `locales/en.json`.
 *
 * Missing keys have soft runtime behaviour (`t()` returns the raw
 * dotted-path), which is a visible-in-UI red flag but not a build-time
 * failure. This test is the build-time gate.
 *
 * Sources walked:
 *   - `flow.js`: `titleKey` on every section/subsection node;
 *     `errors.required` on every presents / presentsForEach entry with
 *     `mandatoryToSaveAndContinue: true`.
 *   - `presentation.js`: `pageTitleKey`, `legendKey`, optional `hintKey`
 *     on every OBLIGATION_KEYS entry; `pageTitleKey` + `leadKey` on
 *     every PAGE_KEYS entry.
 *
 * Extend when a new key-carrying property is added to the flow shape,
 * or when a new copy source is introduced (domain labels, hub/CYA
 * controller chrome, formatDomainErrors — all follow in later commits).
 */

import { describe, it, expect } from 'vitest'
import { flow } from './flow/flow.js'
import { hasKey } from './lib/i18n.js'
import { OBLIGATION_KEYS, PAGE_KEYS } from './lib/presentation.js'
import { domain } from './domain/index.js'
import { FORMAT_ERROR_KEYS } from './lib/format-domain-errors.js'
import { CHROME_KEYS } from './lib/chrome.js'

/**
 * Static lists of keys used by the hub / CYA / commodity-lines
 * controllers + their templates. Keep in sync with the `t()` calls in
 * those files. When a key is added and the coverage test fires here
 * with "missing", either add it to en.json or drop the reference.
 */
const HUB_KEYS = [
  'hub.pageTitle',
  'hub.heading',
  'hub.lead',
  'hub.progress.notStarted',
  'hub.progress.fulfilled',
  'hub.progress.inProgress',
  'hub.status.notApplicable',
  'hub.status.notStarted',
  'hub.status.inProgress',
  'hub.status.completed',
  'hub.status.submitted',
  'hub.checkYourAnswersLink',
  'hub.resetButton'
]

const CYA_KEYS = [
  'cya.pageTitle',
  'cya.heading',
  'cya.bannerHeading',
  'cya.changeLinkText',
  'cya.promptEnterValue',
  'cya.submitReady'
]

const COMMODITY_LINES_KEYS = [
  'commodityLines.pageTitle',
  'commodityLines.heading',
  'commodityLines.lead',
  'commodityLines.codeNotChosen',
  'commodityLines.notFilled',
  'commodityLines.changeLinkText',
  'commodityLines.changeLinkHidden',
  'commodityLines.breadcrumbSelf',
  'commodityLines.empty',
  'commodityLines.addButton',
  'commodityLines.backToTaskList',
  'commodityLines.lineHeading',
  'commodityLines.deleteButton',
  'commodityLines.deleteHidden'
]

function collectFlowKeys(node, out = []) {
  if (node.titleKey) out.push(node.titleKey)
  for (const child of node.children ?? []) collectFlowKeys(child, out)
  for (const entry of node.presents ?? []) {
    if (entry.errors?.required) out.push(entry.errors.required)
  }
  const forEach = node.presentsForEach
  if (forEach?.errors?.required) out.push(forEach.errors.required)
  return out
}

function collectPresentationKeys() {
  const keys = []
  for (const entry of OBLIGATION_KEYS.values()) {
    if (entry.pageTitleKey) keys.push(entry.pageTitleKey)
    if (entry.legendKey) keys.push(entry.legendKey)
    if (entry.hintKey) keys.push(entry.hintKey)
  }
  for (const entry of PAGE_KEYS.values()) {
    if (entry.pageTitleKey) keys.push(entry.pageTitleKey)
    if (entry.leadKey) keys.push(entry.leadKey)
  }
  return keys
}

function collectDomainLabelKeys() {
  const keys = new Set()
  for (const entry of domain.values()) {
    const labels = entry?.labels
    if (!labels) continue
    for (const value of Object.values(labels)) {
      if (typeof value === 'string') keys.add(value)
    }
  }
  return [...keys]
}

describe('i18n coverage — flow.js', () => {
  const keys = flow.sections.flatMap((section) => collectFlowKeys(section))

  it('collects at least one key (guards against a silent walk regression)', () => {
    expect(keys.length).toBeGreaterThan(0)
  })

  it('every message key referenced from flow.js resolves in locales/en.json', () => {
    const missing = keys.filter((key) => !hasKey(key))
    expect(
      missing,
      `missing keys in locales/en.json:\n  ${missing.join('\n  ')}`
    ).toEqual([])
  })
})

describe('i18n coverage — presentation.js', () => {
  const keys = collectPresentationKeys()

  it('collects at least one key (guards against a silent walk regression)', () => {
    expect(keys.length).toBeGreaterThan(0)
  })

  it('every message key referenced from presentation.js resolves in locales/en.json', () => {
    const missing = keys.filter((key) => !hasKey(key))
    expect(
      missing,
      `missing keys in locales/en.json:\n  ${missing.join('\n  ')}`
    ).toEqual([])
  })
})

describe('i18n coverage — domain enum labels', () => {
  const keys = collectDomainLabelKeys()

  it('collects at least one key (guards against a silent walk regression)', () => {
    expect(keys.length).toBeGreaterThan(0)
  })

  it('every label message key referenced from domain/index.js resolves in locales/en.json', () => {
    const missing = keys.filter((key) => !hasKey(key))
    expect(
      missing,
      `missing keys in locales/en.json:\n  ${missing.join('\n  ')}`
    ).toEqual([])
  })
})

describe('i18n coverage — formatDomainErrors COPY', () => {
  it('collects at least one key (guards against a silent regression)', () => {
    expect(FORMAT_ERROR_KEYS.length).toBeGreaterThan(0)
  })

  it('every key referenced from format-domain-errors.js resolves in locales/en.json', () => {
    const missing = FORMAT_ERROR_KEYS.filter((key) => !hasKey(key))
    expect(
      missing,
      `missing keys in locales/en.json:\n  ${missing.join('\n  ')}`
    ).toEqual([])
  })
})

describe('i18n coverage — chrome + controller keys', () => {
  const cases = [
    ['chrome', CHROME_KEYS],
    ['hub controller / template', HUB_KEYS],
    ['CYA controller / template', CYA_KEYS],
    ['commodity-lines controller / template', COMMODITY_LINES_KEYS]
  ]

  for (const [name, keys] of cases) {
    it(`${name} keys all resolve in locales/en.json`, () => {
      const missing = keys.filter((key) => !hasKey(key))
      expect(
        missing,
        `missing keys in locales/en.json:\n  ${missing.join('\n  ')}`
      ).toEqual([])
    })
  }
})
