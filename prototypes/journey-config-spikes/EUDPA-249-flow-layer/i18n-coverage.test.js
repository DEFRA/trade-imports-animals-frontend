/**
 * i18n coverage — walk every message key referenced from the flow
 * declaration and assert it resolves in `locales/en.json`.
 *
 * Missing keys have soft runtime behaviour (`t()` returns the raw
 * dotted-path), which is a visible-in-UI red flag but not a build-time
 * failure. This test is the build-time gate.
 *
 * The walk covers:
 *   - `titleKey` on every section and subsection node
 *   - `errors.required` (a key) on every presents / presentsForEach
 *     entry that carries `mandatoryToSaveAndContinue: true`
 *
 * Extend when a new key-carrying property is added to the flow shape.
 * (Commit 2 will extend this test to walk presentation.js as well.)
 */

import { describe, it, expect } from 'vitest'
import { flow } from './flow/flow.js'
import { hasKey } from './lib/i18n.js'

function collectKeys(node, out = []) {
  if (node.titleKey) out.push(node.titleKey)
  for (const child of node.children ?? []) collectKeys(child, out)
  for (const entry of node.presents ?? []) {
    if (entry.errors?.required) out.push(entry.errors.required)
  }
  const forEach = node.presentsForEach
  if (forEach?.errors?.required) out.push(forEach.errors.required)
  return out
}

describe('i18n coverage — flow.js', () => {
  const keys = flow.sections.flatMap((section) => collectKeys(section))

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
