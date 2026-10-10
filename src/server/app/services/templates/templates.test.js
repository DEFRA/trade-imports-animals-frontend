import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const originalMode = process.env.STUB_MODE

const OWNER = '2100010101'
const JANUARY = '2026-01-01T10:00:00Z'

const savedTemplate = (id, name, created) => ({
  id,
  name,
  setId: 'live-animals',
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
