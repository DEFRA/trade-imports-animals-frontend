/**
 * generate-model.test.js — staleness guard for MODEL.md.
 *
 * MODEL.md is auto-generated from the manifest by
 * `docs/generate-model.js` (baseline SHA stamped in the header so
 * regeneration is byte-identical on an unchanged tree). If the manifest
 * or flow changes without regenerating, or if the doc is hand-edited,
 * this test fails and points at the fix (`npm run docs:model`).
 */

import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

import { renderModelMd, modelPath } from './generate-model.js'

describe('MODEL.md staleness guard', () => {
  it('matches the freshly rendered generator output byte-for-byte', () => {
    const generated = renderModelMd()
    const committed = readFileSync(modelPath, 'utf-8')
    expect(committed).toBe(generated)
  })

  it('fails with a clear remediation pointer when stale', () => {
    // Contract check: the test above compares strings directly, so
    // Vitest's diff already surfaces the drift. This second assertion
    // exists so a reader landing on a failure sees the fix in the
    // test source — not just a byte diff.
    const generated = renderModelMd()
    const committed = readFileSync(modelPath, 'utf-8')
    if (committed !== generated) {
      throw new Error(
        'MODEL.md is out of sync with the manifest / flow / generator. ' +
          'Regenerate via `npm run docs:model` and commit the diff.'
      )
    }
    expect(true).toBe(true)
  })
})
