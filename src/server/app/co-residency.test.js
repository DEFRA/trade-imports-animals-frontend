import path from 'node:path'
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { config } from '../../config/config.js'
import { nunjucksConfig } from '../../config/nunjucks/nunjucks.js'
import { DEFAULT_SET_BASE, router } from '../router.js'
import {
  enforcedAtContinue,
  maxEntriesFrom,
  systemAnswerKeys,
  systemPopulated
} from './bridge/obligation-source.js'
import { records as liveAnimalsRecords } from './services/persistence/records/index.js'
import { SESSION_COOKIE_NAMES } from './sets/live-animals/journeys/linear/config.js'
import {
  currentSetId,
  enterSetContext,
  registerSetMount,
  withSetContext
} from './shared/set-context.js'

const LIVE_ANIMALS = 'live-animals'
const LIVE_ANIMALS_BASE = `/${LIVE_ANIMALS}`
const FOREIGN_REALM = 'foreign-realm'
const FOREIGN_REALM_BASE = `/${FOREIGN_REALM}`
const FOREIGN_REALM_RESPONSE = 'foreign realm handler ran'

const foreignRealm = {
  plugin: {
    name: 'foreign-realm-probe',
    register(server) {
      registerSetMount(FOREIGN_REALM, FOREIGN_REALM_BASE)
      server.ext(
        'onPreAuth',
        (_request, h) => {
          enterSetContext(FOREIGN_REALM)
          return h.continue
        },
        { sandbox: 'plugin' }
      )
      server.route({
        method: 'GET',
        path: `${FOREIGN_REALM_BASE}/probe`,
        handler: () => ({
          message: FOREIGN_REALM_RESPONSE,
          setId: currentSetId()
        })
      })
    }
  }
}

const bootServer = async ({ sets }) => {
  const server = Hapi.server({
    routes: {
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      }
    }
  })

  await server.register([nunjucksConfig, router, ...sets])
  await server.initialize()

  return server
}

describe('co-residency', () => {
  let server

  beforeAll(async () => {
    server = await bootServer({
      sets: [foreignRealm]
    })
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('serves the live-animals dashboard from its mounted gateway', async () => {
    const response = await server.inject(LIVE_ANIMALS_BASE)

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('Import notification service')
    expect(response.result).toContain('Start a new notification')
  })

  it('resolves the live-animals manifest policy through all four accessors', () => {
    const policy = withSetContext(LIVE_ANIMALS, () => ({
      systemPopulated: [...systemPopulated()],
      enforcedAtContinue: [...enforcedAtContinue()],
      maxEntriesFrom: maxEntriesFrom(),
      systemAnswerKeys: [...systemAnswerKeys()]
    }))

    expect(policy).toEqual({
      systemPopulated: ['poApprovedReferenceNumber'],
      enforcedAtContinue: ['countryOfOrigin', 'commoditySelection'],
      maxEntriesFrom: {
        animalIdentifiers: 'numberOfAnimalsQuantity'
      },
      systemAnswerKeys: ['referenceNumber']
    })
  })

  it('uses live-animals cookie names and scopes them to its mount', async () => {
    const response = await server.inject({
      method: 'POST',
      url: `${LIVE_ANIMALS_BASE}/notifications`
    })
    const responseCookies = response.headers['set-cookie'] ?? []

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toMatch(
      /^\/live-animals\/notifications\/[^/]+\/import-type$/
    )
    expect(responseCookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${SESSION_COOKIE_NAMES.knownJourneys}=`)
      ])
    )
    for (const cookieName of Object.values(SESSION_COOKIE_NAMES)) {
      expect(server.states.cookies[cookieName].path).toBe(LIVE_ANIMALS_BASE)
    }
  })

  it('redirects the unowned root temporarily to the named default set', async () => {
    const response = await server.inject('/')

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(DEFAULT_SET_BASE)
  })

  it('keeps signout at its unprefixed server-wide path', async () => {
    const response = await server.inject('/signout')

    expect(response.statusCode).not.toBe(404)
  })

  it('keeps static assets at their unprefixed server-wide path', async () => {
    const response = await server.inject(
      `${config.get('assetPath')}/assets/images/govuk-crest.svg`
    )

    expect(response.statusCode).toBe(200)
  })

  it('keeps health at its unprefixed server-wide path', async () => {
    const response = await server.inject('/health')

    expect(response.statusCode).toBe(200)
  })

  it('does not run the live-animals entry guard for a foreign plugin realm', async () => {
    const response = await server.inject(`${FOREIGN_REALM_BASE}/probe`)

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      message: FOREIGN_REALM_RESPONSE,
      setId: FOREIGN_REALM
    })
  })

  it('retains live-animals context across genuinely interleaved requests', async () => {
    const originalList = liveAnimalsRecords.list
    const events = []
    const contexts = []
    let releaseFirst
    let markFirstSuspended
    const firstCanResume = new Promise((resolve) => {
      releaseFirst = resolve
    })
    const firstSuspended = new Promise((resolve) => {
      markFirstSuspended = resolve
    })

    liveAnimalsRecords.list = async (...args) => {
      contexts.push(['live-animals', 'before', currentSetId()])
      events.push('first suspended')
      markFirstSuspended()
      await firstCanResume
      events.push('first resumed')
      const result = await originalList(...args)
      contexts.push(['live-animals', 'after', currentSetId()])
      return result
    }

    try {
      const firstRequest = server.inject(LIVE_ANIMALS_BASE)
      await firstSuspended

      events.push('second started')
      const secondResponse = await server.inject(`${FOREIGN_REALM_BASE}/probe`)
      events.push('second finished')
      expect(secondResponse.statusCode).toBe(200)
      expect(secondResponse.result).toEqual({
        message: FOREIGN_REALM_RESPONSE,
        setId: FOREIGN_REALM
      })

      releaseFirst()
      const firstResponse = await firstRequest
      expect(firstResponse.statusCode).toBe(200)

      expect(events).toEqual([
        'first suspended',
        'second started',
        'second finished',
        'first resumed'
      ])
      expect(contexts).toEqual([
        ['live-animals', 'before', LIVE_ANIMALS],
        ['live-animals', 'after', LIVE_ANIMALS]
      ])
    } finally {
      releaseFirst()
      liveAnimalsRecords.list = originalList
    }
  })
})
