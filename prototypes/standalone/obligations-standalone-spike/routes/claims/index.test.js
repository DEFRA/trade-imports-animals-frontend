import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestServer } from '../test-server.js'

/** The claims loop end-to-end through the routes: manage list, add,
 * remove-by-index, and the headless Yes-No-Yes non-rehydration pin. */

let t
beforeEach(async () => {
  t = await createTestServer()
  await t.startJourney()
})
afterEach(() => t.stop())

const openClaims = () =>
  t.post(`${t.base}/driving-history`, { hadClaims: 'yes' })
const addClaim = (form) => t.post(`${t.base}/claims/add`, form)

describe('routes/claims — the manage list', () => {
  it('answering hadClaims yes advances into the claims loop', async () => {
    const response = await openClaims()
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${t.base}/claims`)
  })

  it('renders empty with the pinned Add a claim button name', async () => {
    await openClaims()
    const response = await t.get(`${t.base}/claims`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Claims you have added')
    expect(response.payload).toContain('You have not added any claims yet.')
    expect(response.payload).toContain('Add a claim')
    expect(response.payload).not.toContain('Add another claim')
  })

  it('lists Claim N rows with Remove claim N accessible names', async () => {
    await openClaims()
    await addClaim({ claimType: 'theft', claimAmount: '£450' })
    const response = await t.get(`${t.base}/claims`)
    expect(response.payload).toContain('Claim 1')
    expect(response.payload).toContain('Theft — £450')
    expect(response.payload).toContain('Add another claim')
    expect(response.payload).toContain(`${t.base}/claims/0/remove`)
    expect(response.payload).toContain('claim 1')
  })

  it('Continue advances to the next page in the section', async () => {
    await openClaims()
    await addClaim({ claimType: 'theft', claimAmount: '450' })
    const response = await t.post(`${t.base}/claims`, { action: 'continue' })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${t.base}/cover-type`)
  })

  it('the add action redirects to the add sub-page', async () => {
    await openClaims()
    const response = await t.post(`${t.base}/claims`, { action: 'add' })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${t.base}/claims/add`)
  })
})

describe('routes/claims — the add sub-page', () => {
  it('renders the two claim fields under the pinned Add claim button', async () => {
    await openClaims()
    const response = await t.get(`${t.base}/claims/add`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Add a claim')
    expect(response.payload).toContain('name="claimType"')
    expect(response.payload).toContain('name="claimAmount"')
    expect(response.payload).toContain('Add claim')
  })

  it('a typeless claim still counts (spike-a parity)', async () => {
    await openClaims()
    await addClaim({})
    const response = await t.get(`${t.base}/claims`)
    expect(response.payload).toContain('Claim 1')
    expect(response.payload).toContain('Not provided')
  })
})

describe('routes/claims — remove and the Yes-No-Yes wipe', () => {
  it('remove-by-index empties the list', async () => {
    await openClaims()
    await addClaim({ claimType: 'accident', claimAmount: '100' })
    const removed = await t.get(`${t.base}/claims/0/remove`)
    expect(removed.statusCode).toBe(302)
    const response = await t.get(`${t.base}/claims`)
    expect(response.payload).toContain('You have not added any claims yet.')
  })

  it('an out-of-range index redirects without removing anything', async () => {
    await openClaims()
    await addClaim({ claimType: 'accident', claimAmount: '100' })
    await t.get(`${t.base}/claims/9/remove`)
    const response = await t.get(`${t.base}/claims`)
    expect(response.payload).toContain('Claim 1')
  })

  it('Yes-No-Yes never rehydrates: the wipe destroyed the data', async () => {
    await openClaims()
    await addClaim({ claimType: 'theft', claimAmount: '450' })
    await t.post(`${t.base}/driving-history`, { hadClaims: 'no' })
    await t.post(`${t.base}/driving-history`, { hadClaims: 'yes' })
    const response = await t.get(`${t.base}/claims`)
    expect(response.payload).toContain('You have not added any claims yet.')
    expect(response.payload).not.toContain('Theft — £450')
  })
})
