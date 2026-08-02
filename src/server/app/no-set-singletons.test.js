import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { config } from '../../config/config.js'
import { createServer } from '../server.js'
import playwrightConfig from '../../../playwright.config.js'
import { authenticatedCredentials } from './engine/test-support.js'
import * as gateways from './routes.js'
import {
  currentSetBase,
  currentSetId,
  mountedSetIds,
  registerSetMount,
  routeWithSetContext,
  setKeyed,
  withSetContext
} from './shared/set-context.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

// Empty BY DESIGN. Adding an entry exempts a seam from co-residency, which is
// a design decision rather than a fix for a failing convention test.
export const SET_SEAM_ALLOW_LIST = []
export const SET_LIFECYCLE_ALLOW_LIST = []
export const SET_E2E_RUNNER_ALLOW_LIST = []

const APP_DIR = fileURLToPath(new URL('.', import.meta.url))
const REPO_DIR = fileURLToPath(new URL('../../..', import.meta.url))
const SETS_DIR = fileURLToPath(new URL('./sets', import.meta.url))
const L2_DIRS = ['model', 'bridge', 'flow', 'engine', 'services']
const KNOWN_SET_SEAMS = [
  'configureObligationSet',
  'configureFulfilmentRegistry',
  'configureJourneyFlow',
  'buildDispatch',
  'configureRecords',
  'configureSession',
  'configureCommodityReference'
]

const sourceFiles = L2_DIRS.flatMap((directory) => {
  const root = fileURLToPath(new URL(`./${directory}`, import.meta.url))
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.js') &&
        !entry.name.endsWith('.test.js')
    )
    .map((entry) => path.join(entry.parentPath, entry.name))
})

const sources = sourceFiles.map((filename) => ({
  filename: path.relative(APP_DIR, filename),
  source: readFileSync(filename, 'utf8')
}))

const gatewayBarrelSource = readFileSync(
  fileURLToPath(new URL('./routes.js', import.meta.url)),
  'utf8'
)
const gatewaySources = [
  ...gatewayBarrelSource.matchAll(/from '\.\/(?<filename>routes-[a-z-]+\.js)'/g)
].map(({ groups }) => ({
  filename: groups.filename,
  source: readFileSync(
    fileURLToPath(new URL(`./${groups.filename}`, import.meta.url)),
    'utf8'
  )
}))

const discoveredSets = readdirSync(SETS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map(({ name: setId }) => {
    const setDir = path.join(SETS_DIR, setId)
    const e2eSpecs = readdirSync(setDir, {
      recursive: true,
      withFileTypes: true
    })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.e2e.spec.js'))
      .map((entry) => path.join(entry.parentPath, entry.name))

    return { setId, e2eSpecs }
  })

const playwrightProjects = playwrightConfig.projects.map(
  ({ name, testDir }) => ({
    name,
    testDir: path.resolve(REPO_DIR, testDir ?? playwrightConfig.testDir ?? '.')
  })
)

const isWithin = (root, filename) => {
  const relative = path.relative(root, filename)
  return (
    relative === '' ||
    (relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  )
}

const assertSetE2eSpecsHaveRunner = (sets, projects) => {
  for (const { setId, e2eSpecs } of sets) {
    if (e2eSpecs.length === 0 || SET_E2E_RUNNER_ALLOW_LIST.includes(setId)) {
      continue
    }

    const coveringProject = projects.find(({ testDir }) =>
      e2eSpecs.every((spec) => isWithin(testDir, spec))
    )
    if (!coveringProject) {
      throw new Error(
        `Set "${setId}" has e2e specs but no Playwright project testDir covers them`
      )
    }
  }
}

const declarationPattern =
  /export\s+(?:const\s+(?<arrowName>[A-Za-z]\w*)\s*=\s*(?:async\s*)?\((?<arrowParameters>[^)]*)\)\s*=>|(?:async\s+)?function\s+(?<functionName>[A-Za-z]\w*)\s*\((?<functionParameters>[^)]*)\))/g

const declarationsIn = ({ filename, source }) =>
  [...source.matchAll(declarationPattern)].map(({ groups }) => {
    const name = groups.arrowName ?? groups.functionName
    const parameters = groups.arrowParameters ?? groups.functionParameters
    return {
      filename,
      name,
      firstParameter: parameters.split(',')[0].trim() || '(none)'
    }
  })

const setSeamDeclarations = sources.flatMap((file) => {
  if (!file.source.includes('setKeyed(')) {
    return []
  }
  return declarationsIn(file).filter(({ name }) => name.startsWith('configure'))
})

const dispatchDeclaration = sources
  .flatMap(declarationsIn)
  .find(({ name }) => name === 'buildDispatch')

const seamDeclarations = [...setSeamDeclarations, dispatchDeclaration].filter(
  Boolean
)

const assertSetIdFirst = ({ filename, name, firstParameter }) => {
  if (firstParameter !== 'setId') {
    throw new Error(
      `${filename}: ${name} must take setId first; found "${firstParameter}"`
    )
  }
}

const moduleCapturePattern =
  /^(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:currentSetId|\w+\.current)\s*\(/m

const assertNoModuleSetCapture = ({ filename, source }) => {
  const capture = source.match(moduleCapturePattern)
  if (capture) {
    throw new Error(
      `${filename}: read accessor captures set state at module load: ${capture[0]}`
    )
  }
}

const assertAccessorFollowsContext = (read) => {
  for (const setId of ['tripwire-first', 'tripwire-second']) {
    const value = withSetContext(setId, read)
    if (value !== setId) {
      throw new Error(
        `read accessor captured "${value}" instead of resolving currentSetId() for "${setId}"`
      )
    }
  }
}

const assertSymmetricMount = (setId, prefix) => {
  if (!/^\/[a-z][a-z0-9-]*$/.test(prefix)) {
    throw new Error(`Set "${setId}" has invalid mount prefix "${prefix}"`)
  }
  if (prefix !== `/${setId}`) {
    throw new Error(
      `Set "${setId}" must mount at "/${setId}"; found "${prefix}"`
    )
  }
}

const SERVER_WIDE_PATHS = [
  '/health',
  '/signout',
  '/auth/sign-in',
  '/auth/sign-in-oidc',
  '/auth/sign-out',
  '/auth/sign-out-oidc',
  '/auth/organisation',
  `${config.get('assetPath')}/{param*}`
]

const assertServerWideRoutes = (routePaths, setIds) => {
  for (const setId of setIds) {
    for (const serverWidePath of SERVER_WIDE_PATHS) {
      const prefixedPath = `/${setId}${serverWidePath}`
      if (routePaths.has(prefixedPath)) {
        throw new Error(
          `Server-wide route "${serverWidePath}" was registered at "${prefixedPath}"`
        )
      }
    }
  }
  for (const serverWidePath of SERVER_WIDE_PATHS) {
    if (!routePaths.has(serverWidePath)) {
      throw new Error(`Missing server-wide route "${serverWidePath}"`)
    }
  }
}

const assertTemporaryRootRedirect = (response) => {
  if (response.statusCode !== 302) {
    throw new Error(
      `Server root must remain a server-wide 302; found ${response.statusCode}`
    )
  }
}

const contextMappedRoutesPattern =
  /server\.route\(\s*allRoutes\.map\(\s*\(route\)\s*=>\s*routeWithSetContext\(\s*SET_ID,\s*route\s*\)\s*\)\s*\)/m
const contextualEntryGuardPattern =
  /withSetContext\(\s*SET_ID,\s*\(\)\s*=>\s*journeyEntryGuardTarget\(request,\s*h\)\s*\)/m

const assertSetGatewayLifecycleContext = ({ filename, source }) => {
  if (SET_LIFECYCLE_ALLOW_LIST.includes(filename)) {
    return
  }
  if (!contextMappedRoutesPattern.test(source)) {
    throw new Error(
      `${filename}: set routes must be registered through routeWithSetContext(SET_ID, route)`
    )
  }
  if (!contextualEntryGuardPattern.test(source)) {
    throw new Error(
      `${filename}: the plugin entry guard must run inside withSetContext(SET_ID, ...)`
    )
  }
}

const routeLifecycleMethods = (route) => {
  const methods = [{ point: 'handler', method: route.handler }]
  for (const [point, extension] of Object.entries(route.options?.ext ?? {})) {
    for (const item of Array.isArray(extension) ? extension : [extension]) {
      methods.push({
        point,
        method: typeof item === 'function' ? item : item.method
      })
    }
  }
  return methods.filter(({ method }) => typeof method === 'function')
}

const assertRouteLifecycleContext = async (filename, setId, route) => {
  for (const { point, method } of routeLifecycleMethods(route)) {
    const observedSetId = await withSetContext('tripwire-ambient', () =>
      method({}, {})
    )
    if (observedSetId !== setId) {
      throw new Error(
        `${filename}: route ${point} must establish set context "${setId}"; found "${observedSetId}"`
      )
    }
  }
}

describe('set configuration seams', () => {
  it('Should find the configure seams', () => {
    expect(seamDeclarations.map(({ name }) => name)).toEqual(
      expect.arrayContaining(KNOWN_SET_SEAMS)
    )
  })

  it('keeps the set seam allow-list empty', () => {
    expect(SET_SEAM_ALLOW_LIST).toEqual([])
  })

  it('requires every set seam to take setId first', () => {
    expect(() => seamDeclarations.forEach(assertSetIdFirst)).not.toThrow()
  })

  it('rejects a configure seam that drops setId', () => {
    const [violation] = declarationsIn({
      filename: 'fixture/singleton-seam.js',
      source: 'export const configureRecords = (implementation) => {}'
    })

    expect(() => assertSetIdFirst(violation)).toThrow(
      'fixture/singleton-seam.js: configureRecords must take setId first; found "implementation"'
    )
  })

  it('keeps accessors free of module-load set captures', () => {
    expect(() => sources.forEach(assertNoModuleSetCapture)).not.toThrow()
  })

  it('resolves the shared keyed accessor through the current set context', () => {
    const store = setKeyed('tripwire seam')
    store.configure('tripwire-first', 'tripwire-first')
    store.configure('tripwire-second', 'tripwire-second')

    expect(() => assertAccessorFollowsContext(store.current)).not.toThrow()
  })

  it('rejects a read accessor captured when the first set boots', () => {
    const values = new Map([
      ['tripwire-first', 'tripwire-first'],
      ['tripwire-second', 'tripwire-second']
    ])
    const capturedSetId = withSetContext('tripwire-first', currentSetId)
    const capturedAccessor = () => values.get(capturedSetId)

    expect(() => assertAccessorFollowsContext(capturedAccessor)).toThrow(
      'read accessor captured "tripwire-first" instead of resolving currentSetId() for "tripwire-second"'
    )
  })

  it('rejects a source accessor that captures set state at module load', () => {
    expect(() =>
      assertNoModuleSetCapture({
        filename: 'fixture/captured-seam.js',
        source: 'const capturedSetId = currentSetId()'
      })
    ).toThrow(
      'fixture/captured-seam.js: read accessor captures set state at module load'
    )
  })
})

describe('symmetric set mounts', () => {
  let mountedGateways

  beforeAll(async () => {
    const server = Hapi.server()
    mountedGateways = Object.values(gateways).filter(
      (gateway) => gateway?.plugin?.register
    )
    for (const gateway of mountedGateways) {
      const setId = gateway.plugin.name
      await server.register(gateway, { routes: { prefix: `/${setId}` } })
    }
  })

  it('Should find the set mounts', () => {
    expect(mountedGateways.length).toBeGreaterThan(0)
    expect(mountedSetIds().length).toBeGreaterThan(0)
  })

  it('derives every single-segment mount from its set id', () => {
    for (const setId of mountedSetIds()) {
      const prefix = withSetContext(setId, currentSetBase)
      expect(() => assertSymmetricMount(setId, prefix)).not.toThrow()
    }
  })

  it('rejects empty, nested and mismatched mount prefixes', () => {
    expect(() => assertSymmetricMount('fixture', '')).toThrow(
      'Set "fixture" has invalid mount prefix ""'
    )
    expect(() => assertSymmetricMount('fixture', '/sets/fixture')).toThrow(
      'Set "fixture" has invalid mount prefix "/sets/fixture"'
    )
    expect(() => assertSymmetricMount('fixture', '/other')).toThrow(
      'Set "fixture" must mount at "/fixture"; found "/other"'
    )
  })

  it('rejects a gateway that registers itself at an empty prefix', async () => {
    const server = Hapi.server()
    const emptyPrefixGateway = {
      plugin: {
        name: 'empty-prefix-fixture',
        register() {
          registerSetMount('empty-prefix-fixture', '')
        }
      }
    }

    await expect(server.register(emptyPrefixGateway)).rejects.toThrow(
      'Set "empty-prefix-fixture" needs a mount prefix'
    )
  })
})

describe('server-wide routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('Should find every server-wide route outside the set mounts', () => {
    const routePaths = new Set(
      server.table().map(({ path: routePath }) => routePath)
    )

    expect(() =>
      assertServerWideRoutes(routePaths, mountedSetIds())
    ).not.toThrow()
  })

  it('keeps the server root as a server-wide temporary redirect', async () => {
    const response = await server.inject({
      url: '/',
      auth: {
        strategy: 'session',
        credentials: authenticatedCredentials
      }
    })

    expect(() => assertTemporaryRootRedirect(response)).not.toThrow()
  })

  it('rejects signout when a gateway silently prefixes it', async () => {
    const fixture = Hapi.server()
    await fixture.register(
      {
        plugin: {
          name: 'prefixed-signout-fixture',
          register(realmServer) {
            realmServer.route({
              method: 'GET',
              path: '/signout',
              handler: () => 'signed out'
            })
          }
        }
      },
      { routes: { prefix: '/fixture' } }
    )
    const routePaths = new Set(
      fixture.table().map(({ path: routePath }) => routePath)
    )

    expect(() => assertServerWideRoutes(routePaths, ['fixture'])).toThrow(
      'Server-wide route "/signout" was registered at "/fixture/signout"'
    )
  })

  it('rejects a permanent redirect at the server root', async () => {
    const fixture = Hapi.server()
    fixture.route({
      method: 'GET',
      path: '/',
      handler: (_request, h) => h.redirect('/live-animals').permanent()
    })
    const response = await fixture.inject('/')

    expect(() => assertTemporaryRootRedirect(response)).toThrow(
      'Server root must remain a server-wide 302; found 301'
    )
  })
})

describe('set-owned lifecycle context', () => {
  it('Should find the set gateways from the route export barrel', () => {
    expect(gatewaySources.length).toBeGreaterThan(0)
  })

  it('keeps the set lifecycle allow-list empty', () => {
    expect(SET_LIFECYCLE_ALLOW_LIST).toEqual([])
  })

  it('requires every discovered gateway to context-wrap its routes and entry guard', () => {
    expect(() =>
      gatewaySources.forEach(assertSetGatewayLifecycleContext)
    ).not.toThrow()
  })

  it('requires the route wrapper to context-wrap handlers and route extensions', async () => {
    const route = routeWithSetContext('fixture-set', {
      handler: currentSetId,
      options: {
        ext: {
          onPreResponse: { method: currentSetId }
        }
      }
    })

    await expect(
      assertRouteLifecycleContext('fixture/routes.js', 'fixture-set', route)
    ).resolves.toBeUndefined()
  })

  it('rejects a set gateway that registers routes raw', () => {
    const violation = {
      filename: 'fixture/routes-raw.js',
      source: `
        server.route(allRoutes)
        withSetContext(SET_ID, () => journeyEntryGuardTarget(request, h))
      `
    }

    expect(() => assertSetGatewayLifecycleContext(violation)).toThrow(
      'fixture/routes-raw.js: set routes must be registered through routeWithSetContext(SET_ID, route)'
    )
  })

  it('rejects an unwrapped route-level options.ext method', async () => {
    const violation = {
      handler: () => withSetContext('fixture-set', currentSetId),
      options: {
        ext: {
          onPreResponse: { method: currentSetId }
        }
      }
    }

    await expect(
      assertRouteLifecycleContext(
        'fixture/unwrapped-route.js',
        'fixture-set',
        violation
      )
    ).rejects.toThrow(
      'fixture/unwrapped-route.js: route onPreResponse must establish set context "fixture-set"; found "tripwire-ambient"'
    )
  })

  it('rejects an unwrapped plugin entry-guard extension', () => {
    const violation = {
      filename: 'fixture/routes-unwrapped-entry-guard.js',
      source: `
        server.route(
          allRoutes.map((route) => routeWithSetContext(SET_ID, route))
        )
        const target = await journeyEntryGuardTarget(request, h)
      `
    }

    expect(() => assertSetGatewayLifecycleContext(violation)).toThrow(
      'fixture/routes-unwrapped-entry-guard.js: the plugin entry guard must run inside withSetContext(SET_ID, ...)'
    )
  })
})

describe('set e2e runner coverage', () => {
  it('Should find the set directories and Playwright projects', () => {
    expect(discoveredSets.length).toBeGreaterThan(0)
    expect(playwrightProjects.length).toBeGreaterThan(0)
  })

  it('keeps the set e2e runner allow-list empty', () => {
    expect(SET_E2E_RUNNER_ALLOW_LIST).toEqual([])
  })

  it("requires every set's e2e specs to have a covering Playwright project", () => {
    expect(() =>
      assertSetE2eSpecsHaveRunner(discoveredSets, playwrightProjects)
    ).not.toThrow()
  })

  it('rejects a set with e2e specs and no covering Playwright project', () => {
    const violation = [
      {
        setId: 'fixture-uncovered',
        e2eSpecs: [
          path.join(
            REPO_DIR,
            'src/server/app/sets/fixture-uncovered/journeys/linear/features/page/page.e2e.spec.js'
          )
        ]
      }
    ]
    const unrelatedProjects = [
      { name: 'unrelated', testDir: path.join(REPO_DIR, 'e2e') }
    ]

    expect(() =>
      assertSetE2eSpecsHaveRunner(violation, unrelatedProjects)
    ).toThrow(
      'Set "fixture-uncovered" has e2e specs but no Playwright project testDir covers them'
    )
  })

  it('allows a set with no e2e specs to have no Playwright project', () => {
    const setWithoutSpecs = [{ setId: 'fixture-empty', e2eSpecs: [] }]

    expect(() => assertSetE2eSpecsHaveRunner(setWithoutSpecs, [])).not.toThrow()
  })
})
