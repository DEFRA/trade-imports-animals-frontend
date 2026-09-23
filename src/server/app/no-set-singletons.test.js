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

import { routeWithSetContext } from './shared/set-context.js'

const APP_DIR = path.dirname(fileURLToPath(import.meta.url))

/** Comments are stripped before matching: a gateway that explains the sandbox
 * option in prose would otherwise be counted as using it. */
const withoutComments = (source) =>
  source
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')

/** The second-set fixture is a gateway too: the co-residency suite registers it
 * beside the shipped one, so a rule it quietly stops following would take the
 * whole second-set evidence base with it. */
const FIXTURE_GATEWAY = path.resolve(
  APP_DIR,
  '../../../test/fixtures/second-set.js'
)

const gatewayFiles = () =>
  [
    ...readdirSync(APP_DIR)
      .filter((name) => /^routes-[a-z0-9-]+\.js$/.test(name))
      .map((name) => path.join(APP_DIR, name)),
    FIXTURE_GATEWAY
  ].map((file) => ({
    name: path.basename(file),
    source: withoutComments(readFileSync(file, 'utf8'))
  }))

/**
 * The text of every argument list passed to `name(`, read by matching
 * parentheses rather than by a regex, so a multi-line call with nested calls
 * inside it is counted once and read whole.
 */
const callsOf = (source, name) => {
  const opener = new RegExp(`\\b${name}\\(`, 'g')
  const calls = []
  let match = opener.exec(source)
  while (match !== null) {
    let depth = 1
    let cursor = opener.lastIndex
    while (cursor < source.length && depth > 0) {
      if (source[cursor] === '(') {
        depth += 1
      }
      if (source[cursor] === ')') {
        depth -= 1
      }
      cursor += 1
    }
    calls.push(source.slice(opener.lastIndex, cursor - 1))
    match = opener.exec(source)
  }
  return calls
}

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

  // Counted, not looked for: one wrapped registration alongside an unwrapped
  // one satisfies "contains the string" and leaves the unwrapped one silent
  // until a second set mounts.
  it('Should re-enter its own set around every entry guard it registers', () => {
    for (const { name, source } of gatewayFiles()) {
      const entryGuards = callsOf(source, 'server\\.ext').filter((argument) =>
        argument.includes("'onPreHandler'")
      )
      expect(
        entryGuards.length,
        `${name} registers no onPreHandler — has the entry guard moved?`
      ).toBeGreaterThan(0)

      const wrapped = entryGuards.filter((argument) =>
        argument.includes('withSetContext(SET_ID')
      )
      expect(
        wrapped.length,
        `${name} registers ${entryGuards.length} onPreHandler extension(s) but re-enters its set in ${wrapped.length}`
      ).toBe(entryGuards.length)
    }
  })

  it('Should wrap its routes so handlers resolve their own set', () => {
    for (const { name, source } of gatewayFiles()) {
      const registrations = callsOf(source, 'server\\.route')
      expect(
        registrations.length,
        `${name} registers no routes — has the gateway moved?`
      ).toBeGreaterThan(0)

      const wrapped = registrations.filter((argument) =>
        argument.includes('routeWithSetContext(SET_ID')
      )
      expect(
        wrapped.length,
        `${name} makes ${registrations.length} server.route call(s) but wraps ${wrapped.length}`
      ).toBe(registrations.length)
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

  // registerJourneyCookie reads the cookie NAMES off the configured session
  // seam, so registering before configureSession silently registers the shared
  // defaults and the set then reads cookies nobody set.
  it('Should register journey cookies only after the session seam is configured', () => {
    for (const { name, source } of gatewayFiles()) {
      expect(callsOf(source, 'configureSession'), name).toHaveLength(1)
      expect(callsOf(source, 'registerJourneyCookie'), name).toHaveLength(1)
      expect(
        source.indexOf('configureSession('),
        `${name} registers journey cookies before configuring the session`
      ).toBeLessThan(source.indexOf('registerJourneyCookie('))
    }
  })
})

/**
 * `routeWithSetContext` can only wrap the route keys it knows about. A route
 * that declares its handler as `options.handler`, or does work in `options.pre`,
 * is the same defect class as an unwrapped handler: it resolves whichever set
 * is ambient. This walks the shapes the sets actually declare and insists every
 * function among them comes back wrapped.
 */
describe('no set singletons — every declared route shape is wrapped', () => {
  const declaredMethods = (route) => [
    ['handler', route.handler],
    ['options.handler', route.options?.handler],
    ...[route.options?.pre ?? []]
      .flat()
      .map((entry, index) => [
        `options.pre[${index}]`,
        typeof entry === 'function' ? entry : entry?.method
      ])
  ]

  const wrappedValueOf = (route, key) => {
    const [head, ...rest] = key.split('.')
    if (head === 'handler') {
      return route.handler
    }
    const [name] = rest
    if (name === 'handler') {
      return route.options?.handler
    }
    const index = Number(/\[(?<index>\d+)]/.exec(name).groups.index)
    const entry = [route.options?.pre ?? []].flat()[index]
    return typeof entry === 'function' ? entry : entry?.method
  }

  it.each([
    [
      'live-animals',
      './sets/live-animals/journeys/linear/features/index.js',
      'allRoutes'
    ],
    ['the second-set fixture', '../../../test/fixtures/second-set.js', 'routes']
  ])('Should wrap every method %s declares', async (_label, module, name) => {
    const routes = (await import(module))[name]
    expect(routes.length).toBeGreaterThan(0)

    for (const route of routes) {
      const wrapped = routeWithSetContext('any-set', route)
      for (const [key, method] of declaredMethods(route)) {
        if (typeof method === 'function') {
          expect(
            wrappedValueOf(wrapped, key),
            `${route.method} ${route.path} leaves ${key} unwrapped`
          ).not.toBe(method)
        }
      }
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
