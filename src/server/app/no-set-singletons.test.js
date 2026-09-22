/**
 * Convention tripwire for co-residency.
 *
 * The co-residency suite proves two sets behave once they are wired correctly.
 * This one reads the source and proves the next set cannot be wired wrongly in
 * the first place — the failures it guards against are silent with one set
 * mounted and only surface when a second arrives.
 *
 * Source-level rather than behavioural on purpose: a set-owned `server.ext`
 * registered without `{ sandbox: 'plugin' }` is server-wide, and whether that
 * is visible at runtime depends on plugin registration order. Reading the
 * gateway is the only way to catch it every time.
 */
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const APP_DIR = path.dirname(fileURLToPath(import.meta.url))

/** Comments are stripped before matching: a gateway that explains the sandbox
 * option in prose would otherwise be counted as using it. */
const withoutComments = (source) =>
  source
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')

const gatewayFiles = () =>
  readdirSync(APP_DIR)
    .filter((name) => /^routes-[a-z0-9-]+\.js$/.test(name))
    .map((name) => ({
      name,
      source: withoutComments(readFileSync(path.join(APP_DIR, name), 'utf8'))
    }))

/** Every seam a set configures. A new one added without a set id would let the
 * second set overwrite the first, which is the whole defect class. */
const SEAMS = [
  'configureObligationSet',
  'configureFulfilmentRegistry',
  'configureCommodityReference',
  'configureAnswersForRead',
  'configureReadyForCheckYourAnswers',
  'configureJourneyFlow',
  'buildDispatch',
  'configureRecords',
  'configureSession'
]

describe('no set singletons — every gateway is keyed by its set', () => {
  it('Should find at least one gateway to check', () => {
    expect(gatewayFiles().length).toBeGreaterThan(0)
  })

  it.each(SEAMS)('Should pass the set id first to %s', (seam) => {
    for (const { name, source } of gatewayFiles()) {
      const calls = [
        ...source.matchAll(new RegExp(`\\b${seam}\\(([^,)]*)`, 'g'))
      ]
      for (const [, firstArgument] of calls) {
        expect(
          firstArgument.trim(),
          `${name} calls ${seam} without a set id first`
        ).toBe('SET_ID')
      }
    }
  })

  it('Should sandbox every lifecycle extension a gateway registers', () => {
    for (const { name, source } of gatewayFiles()) {
      const extensions = [...source.matchAll(/server\.ext\(/g)]
      expect(
        extensions.length,
        `${name} registers no extension — has the gateway moved?`
      ).toBeGreaterThan(0)

      // Hapi stores an extension in the plugin realm ONLY when told to; without
      // this option it is server-wide and runs on every other set's routes.
      const sandboxed = [...source.matchAll(/\{ sandbox: 'plugin' \}/g)]
      expect(
        sandboxed.length,
        `${name} registers ${extensions.length} extension(s) but sandboxes ${sandboxed.length}`
      ).toBe(extensions.length)
    }
  })

  it('Should register a mount prefix for its set', () => {
    for (const { name, source } of gatewayFiles()) {
      expect(source, `${name} never calls registerSetMount`).toContain(
        'registerSetMount(SET_ID, SET_BASE)'
      )
    }
  })

  it('Should run its registration inside its own set context', () => {
    for (const { name, source } of gatewayFiles()) {
      expect(
        source,
        `${name} configures seams outside withSetContext`
      ).toContain('withSetContext(SET_ID')
    }
  })

  it('Should wrap its routes so handlers resolve their own set', () => {
    for (const { name, source } of gatewayFiles()) {
      expect(
        source,
        `${name} registers routes without a set context`
      ).toContain('routeWithSetContext(SET_ID')
    }
  })

  it('Should scope its journey cookies to its own base', () => {
    for (const { name, source } of gatewayFiles()) {
      expect(
        source,
        `${name} registers journey cookies without its set base`
      ).toContain('registerJourneyCookie(server, { base: SET_BASE })')
    }
  })
})

describe('no set singletons — the set base is derived, never spelled out', () => {
  it('Should take its mount prefix from the set id', async () => {
    const { SET_BASE, SET_ID } = await import('./sets/live-animals/set.js')

    expect(SET_BASE).toBe(`/${SET_ID}`)
  })

  it('Should never mount a set at the root', async () => {
    const { SET_BASE } = await import('./sets/live-animals/set.js')

    expect(SET_BASE).not.toBe('')
    expect(SET_BASE).not.toBe('/')
  })
})
