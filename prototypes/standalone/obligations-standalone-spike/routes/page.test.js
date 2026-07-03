import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestServer } from './test-server.js'

/** The generic question pages: GDS error round trips on the one
 * page-hard mandate, page-soft blank advances (Rulings item 3), change
 * mode, add-on fan-out and the add-ons catch-all. */

let server
beforeEach(async () => {
  server = await createTestServer()
  await server.startJourney()
})
afterEach(() => server.stop())

describe('routes/page — rendering', () => {
  it('renders a question page with its inputs and no required attribute', async () => {
    const response = await server.get(`${server.base}/email`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Give us your email to begin')
    expect(response.payload).toContain('name="email"')
    expect(response.payload).not.toMatch(/\brequired\b(?!-)/)
  })

  it('back-links to CYA in change mode, the hub otherwise', async () => {
    const plain = await server.get(`${server.base}/about-you`)
    expect(plain.payload).toContain(`href="${server.base}/hub"`)
    const change = await server.get(`${server.base}/about-you?change=1`)
    expect(change.payload).toContain(`href="${server.base}/check-your-answers"`)
  })
})

describe('routes/page — the save gate (Rulings item 3)', () => {
  it('blocks a blank fullName save with a GDS error round trip', async () => {
    const response = await server.post(`${server.base}/about-you`, {})
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('govuk-error-summary')
    expect(response.payload).toContain('There is a problem')
    expect(response.payload).toContain('href="#fullName"')
    expect(response.payload).toContain('id="fullName-error"')
    expect(response.payload).toContain('Full name is required')
  })

  it('re-renders the typed (unsaved) values on a blocked save', async () => {
    const response = await server.post(`${server.base}/about-you`, {
      preferredName: 'Al',
      'dateOfBirth-day': '27'
    })
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('value="Al"')
    expect(response.payload).toContain('value="27"')
  })

  it('blocks a filled-but-invalid value, preserving what was typed', async () => {
    const response = await server.post(`${server.base}/email`, {
      email: 'junk'
    })
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Enter a valid Email')
    expect(response.payload).toContain('value="junk"')
  })

  it('advances a blank page-soft save (the email gate saves blank freely)', async () => {
    const response = await server.post(`${server.base}/email`, {})
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${server.base}/hub`)
  })

  it('advances fullName alone to the next page in the section', async () => {
    const response = await server.post(`${server.base}/about-you`, {
      fullName: 'Alex Driver'
    })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${server.base}/your-vehicle`)
  })

  it('returns to CYA after a ?change=1 save', async () => {
    const response = await server.post(`${server.base}/about-you?change=1`, {
      fullName: 'Alex Driver'
    })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${server.base}/check-your-answers`)
  })
})

describe('routes/page — the add-on fan-out', () => {
  it('the picker save returns to the hub; the spawned follow-up page renders (spike-a parity)', async () => {
    const response = await server.post(`${server.base}/addons`, {
      addons: 'named-driver'
    })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${server.base}/hub`)
    const page = await server.get(`${server.base}/addons/named-driver/who`)
    expect(page.statusCode).toBe(200)
    expect(page.payload).toContain('name="driverName__')
  })

  it('302s an unknown add-on step back to the picker (spike-a parity)', async () => {
    const response = await server.get(`${server.base}/addons/nope/step`)
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${server.base}/addons`)
  })
})
