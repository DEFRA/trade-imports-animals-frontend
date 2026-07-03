import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { JOURNEY_COOKIE } from '../journey/index.js'
import { createTestServer } from './test-server.js'

/** Full request -> contract -> template round trips for the two shell
 * pages, driven through the real Hapi + nunjucks test server. */

const OK = 200

let testServer
beforeEach(async () => {
  testServer = await createTestServer()
})
afterEach(() => testServer.stop())

describe('routes/shell — the start page', () => {
  it('renders the pinned heading and a Start now button', async () => {
    const response = await testServer.get(testServer.base)
    expect(response.statusCode).toBe(OK)
    expect(response.payload).toContain('Get a car insurance quote')
    expect(response.payload).toContain('Start now')
  })

  it('Start now mints a journey cookie and redirects to the hub', async () => {
    const response = await testServer.post(`${testServer.base}/start`)
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${testServer.base}/hub`)
    expect(String(response.headers['set-cookie'])).toContain(JOURNEY_COOKIE)
  })

  it('starting again mints a FRESH journey (never a shared default)', async () => {
    await testServer.startJourney()
    await testServer.post(`${testServer.base}/email`, {
      email: 'sam@example.com'
    })
    let hub = await testServer.get(`${testServer.base}/hub`)
    expect(hub.payload).toContain('You have completed 1 of 3 tasks.')
    await testServer.startJourney()
    hub = await testServer.get(`${testServer.base}/hub`)
    expect(hub.payload).toContain('You have completed 0 of 3 tasks.')
  })
})

describe('routes/shell — the hub (task list)', () => {
  it('renders the task list with Email first and the inert quote row', async () => {
    await testServer.startJourney()
    const response = await testServer.get(`${testServer.base}/hub`)
    expect(response.statusCode).toBe(OK)
    expect(response.payload).toContain('Get a car insurance quote')
    expect(response.payload).toContain('You have completed 0 of 3 tasks.')
    expect(
      response.payload.indexOf('Give us your email to begin')
    ).toBeLessThan(response.payload.indexOf('About you'))
    expect(response.payload).toContain('Cannot start yet')
  })

  it('load-or-creates: the hub renders for a cookie-less visitor', async () => {
    const response = await testServer.get(`${testServer.base}/hub`)
    expect(response.statusCode).toBe(OK)
    expect(String(response.headers['set-cookie'])).toContain(JOURNEY_COOKIE)
  })
})
