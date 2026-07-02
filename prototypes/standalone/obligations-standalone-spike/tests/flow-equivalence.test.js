import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { NavigationError, replayScript } from './helpers/script-runner.js'

/**
 * Tier 4 — cross-Flow evaluator equivalence (TEST-4/16..30, ARCH-3,
 * DEF-1, demonstrated structurally, not proven): each obligation-level
 * script replayed against the polished Flow AND the single-Section
 * skeleton Flow must land the ObligationEvaluator in a deep-equal
 * canonical end-state. The full-quote script is additionally pinned
 * against a hand-authored expected state (TEST-30/TOOL-18) so a bug
 * shared by both Flows cannot certify itself.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const readJson = (...segments) =>
  JSON.parse(fs.readFileSync(path.join(dirname, ...segments), 'utf8'))

const polished = readJson('..', 'model', 'flow.json')
const skeleton = readJson('..', 'model', 'skeleton-flow.json')
const script = (name) => readJson('fixtures', 'scripts', `${name}.script.json`)

/** TEST-29 — a navigation failure must never read as an equivalence diff. */
const replay = (flow, journeyScript) => {
  try {
    return replayScript(flow, journeyScript)
  } catch (error) {
    if (error instanceof NavigationError) {
      throw new Error(
        `NAVIGATION FAILURE (not an equivalence diff): ${error.message}`
      )
    }
    throw error
  }
}

describe('tests/flow-equivalence — cross-Flow evaluator equivalence', () => {
  it.each(['full-quote', 'no-claims', 'claims-yes-no-yes'])(
    'replays %s to a deep-equal canonical end-state under both Flows',
    (name) => {
      const journeyScript = script(name)
      const underPolished = replay(polished, journeyScript)
      const underSkeleton = replay(skeleton, journeyScript)
      expect(underPolished.canonical).toEqual(underSkeleton.canonical)
    }
  )

  it('pins full-quote against the authored expected end-state', () => {
    const { $comment, ...expected } = readJson(
      'fixtures',
      'scripts',
      'full-quote.expected.json'
    )
    const { canonical } = replay(polished, script('full-quote'))
    expect(canonical).toEqual(expected)
  })

  it('is invariant under sectionEntryMode (the Flows deliberately differ)', () => {
    expect(polished.sectionEntryMode).not.toBe(skeleton.sectionEntryMode)
    const flipped = { ...polished, sectionEntryMode: skeleton.sectionEntryMode }
    const journeyScript = script('full-quote')
    expect(replay(flipped, journeyScript).canonical).toEqual(
      replay(polished, journeyScript).canonical
    )
  })

  it('keeps the NA branch equivalent: no-claims never stores claim data', () => {
    for (const flow of [polished, skeleton]) {
      const { canonical } = replay(flow, script('no-claims'))
      expect(canonical.values.claimType).toBeUndefined()
      expect(canonical.values.claimAmount).toBeUndefined()
      expect(canonical.journeyState).toBe('fulfilled')
    }
  })

  it('destroys wiped claims in both Flows: Yes-No-Yes never rehydrates', () => {
    for (const flow of [polished, skeleton]) {
      const { canonical } = replay(flow, script('claims-yes-no-yes'))
      expect(canonical.values.hadClaims).toBe('yes')
      expect(canonical.values.claimType).toBeUndefined()
      expect(canonical.values.claimAmount).toBeUndefined()
    }
  })

  it('separates navigation failures loudly (TEST-29)', () => {
    const gatedScript = {
      name: 'unreachable',
      steps: [{ answers: { claimType: 'accident' } }] // hadClaims unanswered
    }
    expect(() => replayScript(polished, gatedScript)).toThrow(NavigationError)
    expect(() => replay(polished, gatedScript)).toThrow(
      /NAVIGATION FAILURE \(not an equivalence diff\)/
    )
  })
})
