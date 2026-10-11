import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const originalMode = process.env.STUB_MODE

const OWNER = '2100010101'
const LIVE_ANIMALS = 'live-animals'
const WEEKLY_CATTLE = 'Weekly cattle'
const JANUARY = '2026-01-01T10:00:00Z'

const savedTemplate = (id, name, created) => ({
  id,
  name,
  setId: LIVE_ANIMALS,
  created
})

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body })

const stubFetch = (impl) => vi.stubGlobal('fetch', vi.fn(impl))

const realMode = () => {
  process.env.STUB_MODE = 'false'
}

const stubMode = () => {
  process.env.STUB_MODE = 'true'
}

const templatesService = () => import('./index.js')

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalMode === undefined) {
    delete process.env.STUB_MODE
  } else {
    process.env.STUB_MODE = originalMode
  }
})

describe('#listFor', () => {
  test('Should list no templates for a user who has saved none, in stub mode', async () => {
    stubMode()

    const { listFor } = await templatesService()

    expect(await listFor(OWNER)).toEqual([])
  })

  test("Should list only the user's own stub templates, newest first", async () => {
    stubMode()
    const { stubTemplates } = await import('./stub.js')
    const older = savedTemplate('a', 'Acorn Farm', JANUARY)
    const newer = savedTemplate('b', 'Arena Aintree', '2026-02-01T10:00:00Z')
    const other = savedTemplate('c', 'Not mine', JANUARY)
    stubTemplates.set(OWNER, [older, newer])
    stubTemplates.set('2100010102', [other])

    const { listFor } = await templatesService()

    expect(await listFor(OWNER)).toEqual([newer, older])
    stubTemplates.clear()
  })

  test("Should ask the backend for the user's templates by the User-Id header", async () => {
    realMode()
    const saved = savedTemplate('a', 'Acorn Farm', JANUARY)
    const fetched = vi.fn(async () =>
      okResponse({ items: [{ ...saved, extra: 'dropped' }], totalItems: 1 })
    )
    stubFetch(fetched)
    const { backendBaseUrl } =
      await import('../persistence/records/real/config.js')

    const { listFor } = await templatesService()
    const found = await listFor(OWNER)

    expect(fetched).toHaveBeenCalledWith(
      `${backendBaseUrl}/templates`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'User-Id': OWNER })
      })
    )
    expect(found).toEqual([saved])
  })

  test('Should refuse a failed backend list with the backend status', async () => {
    realMode()
    stubFetch(async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable'
    }))

    const { listFor } = await templatesService()

    await expect(listFor(OWNER)).rejects.toMatchObject({
      name: 'BackendRequestError',
      status: 503
    })
  })

  test('Should refuse to list templates without an owner', async () => {
    const { listFor } = await templatesService()

    await expect(listFor(undefined)).rejects.toThrow(
      'Cannot list templates without an owner'
    )
  })
})

const TEMPLATE_ID = '6650f1c2a1b2c3d4e5f60718'

const detail = (overrides = {}) => ({
  id: TEMPLATE_ID,
  name: WEEKLY_CATTLE,
  setId: LIVE_ANIMALS,
  created: JANUARY,
  status: 'IN_PROGRESS',
  version: 0,
  fulfilments: [],
  ...overrides
})

describe('stub templates in progress', () => {
  it('Should hide a template still being created from the list', async () => {
    stubMode()
    const { startFor, listFor } = await templatesService()
    const { stubTemplates } = await import('./stub.js')

    await startFor(OWNER, { setId: LIVE_ANIMALS, name: WEEKLY_CATTLE })

    expect(await listFor(OWNER)).toEqual([])
    stubTemplates.clear()
  })

  it('Should start, read back, rename and fill a template for its owner only', async () => {
    stubMode()
    const { startFor, getFor, updateDetailsFor, replaceFulfilmentsFor } =
      await templatesService()
    const { stubTemplates } = await import('./stub.js')

    const started = await startFor(OWNER, {
      setId: LIVE_ANIMALS,
      name: WEEKLY_CATTLE
    })
    await updateDetailsFor(OWNER, started.id, {
      setId: 'germinal-products',
      name: 'Semen'
    })
    await replaceFulfilmentsFor(OWNER, started.id, [{ obligationId: 'a' }])
    const read = await getFor(OWNER, started.id)

    expect(started).toMatchObject({ status: 'IN_PROGRESS', version: 0 })
    expect(read).toMatchObject({
      name: 'Semen',
      setId: 'germinal-products',
      version: 2,
      fulfilments: [{ obligationId: 'a' }]
    })
    expect(await getFor('2100010102', started.id)).toBeUndefined()
    expect(await getFor(OWNER, 'missing')).toBeUndefined()
    stubTemplates.clear()
  })

  it.each([
    ['start a template', (service) => service.startFor(undefined, {})],
    ['read a template', (service) => service.getFor(undefined, 'a')],
    [
      'change a template',
      (service) => service.updateDetailsFor(undefined, 'a', {})
    ],
    [
      'save a template',
      (service) => service.replaceFulfilmentsFor(undefined, 'a', [])
    ]
  ])('Should refuse to %s without an owner', async (action, call) => {
    const service = await templatesService()

    await expect(call(service)).rejects.toThrow(
      `Cannot ${action} without an owner`
    )
  })
})

describe('real templates in progress', () => {
  const sent = (fetched) => fetched.mock.calls[0]

  it('Should post a new template with the owner header and read the stored one back', async () => {
    realMode()
    const fetched = vi.fn(async () => okResponse(detail()))
    stubFetch(fetched)
    const { backendBaseUrl } =
      await import('../persistence/records/real/config.js')
    const { startFor } = await templatesService()

    const started = await startFor(OWNER, {
      setId: LIVE_ANIMALS,
      name: WEEKLY_CATTLE,
      organisationId: '5900001'
    })

    const [url, options] = sent(fetched)
    expect(url).toBe(`${backendBaseUrl}/templates`)
    expect(options.method).toBe('POST')
    expect(options.headers).toMatchObject({ 'User-Id': OWNER })
    expect(JSON.parse(options.body)).toEqual({
      setId: LIVE_ANIMALS,
      name: WEEKLY_CATTLE,
      organisationId: '5900001'
    })
    expect(started).toMatchObject({ id: TEMPLATE_ID, status: 'IN_PROGRESS' })
  })

  it('Should get a template by its encoded id with the owner header', async () => {
    realMode()
    const fetched = vi.fn(async () => okResponse(detail()))
    stubFetch(fetched)
    const { backendBaseUrl } =
      await import('../persistence/records/real/config.js')
    const { getFor } = await templatesService()

    const found = await getFor(OWNER, TEMPLATE_ID)

    const [url, options] = sent(fetched)
    expect(url).toBe(`${backendBaseUrl}/templates/${TEMPLATE_ID}`)
    expect(options.headers).toMatchObject({ 'User-Id': OWNER })
    expect(found).toMatchObject({ name: WEEKLY_CATTLE, version: 0 })
  })

  it('Should answer undefined for a template the backend does not have', async () => {
    realMode()
    stubFetch(async () => ({ ok: false, status: 404 }))
    const { getFor } = await templatesService()

    expect(await getFor(OWNER, TEMPLATE_ID)).toBeUndefined()
  })

  it('Should answer undefined, without asking, for an id no template can have', async () => {
    realMode()
    const fetched = vi.fn()
    stubFetch(fetched)
    const { getFor } = await templatesService()

    expect(await getFor(OWNER, '../notifications')).toBeUndefined()
    expect(fetched).not.toHaveBeenCalled()
  })

  it('Should put the details and the answers to their own routes', async () => {
    realMode()
    const fetched = vi.fn(async () => okResponse(detail()))
    stubFetch(fetched)
    const { backendBaseUrl } =
      await import('../persistence/records/real/config.js')
    const { updateDetailsFor, replaceFulfilmentsFor } = await templatesService()

    await updateDetailsFor(OWNER, TEMPLATE_ID, {
      setId: LIVE_ANIMALS,
      name: 'Renamed'
    })
    await replaceFulfilmentsFor(OWNER, TEMPLATE_ID, [{ obligationId: 'a' }])

    const [detailsUrl, detailsOptions] = fetched.mock.calls[0]
    const [answersUrl, answersOptions] = fetched.mock.calls[1]
    expect(detailsUrl).toBe(
      `${backendBaseUrl}/templates/${TEMPLATE_ID}/details`
    )
    expect(detailsOptions.method).toBe('PUT')
    expect(JSON.parse(detailsOptions.body)).toEqual({
      setId: LIVE_ANIMALS,
      name: 'Renamed'
    })
    expect(answersUrl).toBe(
      `${backendBaseUrl}/templates/${TEMPLATE_ID}/fulfilments`
    )
    expect(JSON.parse(answersOptions.body)).toEqual({
      fulfilments: [{ obligationId: 'a' }]
    })
  })

  it('Should refuse a failed start with the backend status', async () => {
    realMode()
    stubFetch(async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable'
    }))
    const { startFor } = await templatesService()

    await expect(
      startFor(OWNER, { setId: LIVE_ANIMALS, name: '' })
    ).rejects.toMatchObject({ name: 'BackendRequestError', status: 503 })
  })
})
