import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalMode = process.env.STUB_MODE

const okResponse = (body) => ({ ok: true, json: async () => body })

const stubFetch = (impl) => vi.stubGlobal('fetch', vi.fn(impl))

const okOnlyForBlock = (block, body) => async (url) => {
  if (new URL(url).searchParams.get('blocks') !== block) {
    return { ok: false, status: 400, statusText: 'Unexpected countries query' }
  }
  return okResponse(body)
}

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

describe('countries client', () => {
  it('Should parse a fetched [{code,name}] payload', async () => {
    stubFetch(async () => okResponse([{ code: 'ZZ', name: 'Zedland' }]))
    const { fetchCountries } = await import('./countries/client.js')
    await expect(fetchCountries()).resolves.toEqual([
      { code: 'ZZ', name: 'Zedland' }
    ])
  })

  it('Should request countries filtered to the given blocks', async () => {
    stubFetch(okOnlyForBlock('GBNAG_SPS_EX', [{ code: 'ZZ', name: 'Zedland' }]))
    const { fetchCountries } = await import('./countries/client.js')
    await expect(fetchCountries(['GBNAG_SPS_EX'])).resolves.toEqual([
      { code: 'ZZ', name: 'Zedland' }
    ])
  })

  it('Should throw on a non-ok response', async () => {
    stubFetch(async () => ({ ok: false, status: 503, statusText: 'Down' }))
    const { fetchCountries } = await import('./countries/client.js')
    await expect(fetchCountries()).rejects.toThrow('Failed to get countries')
  })
})

describe('ports client', () => {
  it('Should parse a fetched [{code,name}] payload', async () => {
    stubFetch(async () => okResponse([{ code: 'GB ZZZ', name: 'Zed Port' }]))
    const { fetchPortsOfEntry } = await import('./ports/client.js')
    await expect(fetchPortsOfEntry()).resolves.toEqual([
      { code: 'GB ZZZ', name: 'Zed Port' }
    ])
  })

  it('Should throw on a non-ok response', async () => {
    stubFetch(async () => ({ ok: false, status: 500, statusText: 'Boom' }))
    const { fetchPortsOfEntry } = await import('./ports/client.js')
    await expect(fetchPortsOfEntry()).rejects.toThrow(
      'Failed to get ports of entry'
    )
  })
})

describe('countries service — stub mode', () => {
  it('Should serve stub data through the accessors without priming', async () => {
    process.env.STUB_MODE = 'true'
    const countries = await import('./countries/index.js')
    expect(await countries.originLabel('AT')).toBe('Austria')
    expect(await countries.originCountries()).toContainEqual({
      value: 'AT',
      text: 'Austria'
    })
  })

  it('Should treat the readers as no-ops in stub mode (no fetch, stub retained)', async () => {
    process.env.STUB_MODE = 'true'
    stubFetch(async () => okResponse([{ code: 'ZZ', name: 'Zedland' }]))
    const countries = await import('./countries/index.js')
    expect(await countries.originLabel('AT')).toBe('Austria')
    expect(await countries.originLabel('ZZ')).toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('countries service — real mode', () => {
  it('Should self-load on the first reader call and serve fetched data', async () => {
    process.env.STUB_MODE = 'false'
    stubFetch(okOnlyForBlock('GBNAG_SPS_EX', [{ code: 'ZZ', name: 'Zedland' }]))
    const countries = await import('./countries/index.js')

    expect(await countries.originLabel('ZZ')).toBe('Zedland')
    expect(await countries.originLabel('AT')).toBeUndefined()
    expect(await countries.originCountries()).toEqual([
      { value: 'ZZ', text: 'Zedland' }
    ])
    expect(await countries.addressCountries()).toEqual([
      'United Kingdom',
      'Zedland'
    ])
  })

  it('Should not re-fetch across multiple reader calls once loaded', async () => {
    process.env.STUB_MODE = 'false'
    const fetchMock = vi.fn(
      okOnlyForBlock('GBNAG_SPS_EX', [{ code: 'ZZ', name: 'Zedland' }])
    )
    vi.stubGlobal('fetch', fetchMock)
    const countries = await import('./countries/index.js')

    await countries.originLabel('ZZ')
    await countries.originCountries()
    await countries.addressCountries()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('Should re-attempt on a reader call after a prior load failure', async () => {
    process.env.STUB_MODE = 'false'
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('MDM down'))
      .mockImplementation(
        okOnlyForBlock('GBNAG_SPS_EX', [{ code: 'ZZ', name: 'Zedland' }])
      )
    vi.stubGlobal('fetch', fetchMock)
    const countries = await import('./countries/index.js')

    await expect(countries.originLabel('ZZ')).rejects.toThrow()
    expect(await countries.originLabel('ZZ')).toBe('Zedland')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('Should reject with a serverUnavailable Boom error on load failure', async () => {
    process.env.STUB_MODE = 'false'
    stubFetch(async () => ({ ok: false, status: 503, statusText: 'Down' }))
    const countries = await import('./countries/index.js')

    await expect(countries.originLabel('ZZ')).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 503 }
    })
  })
})

describe('ports service — stub mode', () => {
  it('Should serve stub data through list() without priming', async () => {
    process.env.STUB_MODE = 'true'
    const ports = await import('./ports/index.js')
    expect(await ports.list()).toContainEqual({
      code: 'GB ABD',
      name: 'Aberdeen Harbour'
    })
  })
})

describe('ports service — real mode', () => {
  it('Should self-load on the first reader call and serve fetched ports', async () => {
    process.env.STUB_MODE = 'false'
    stubFetch(async () => okResponse([{ code: 'GB ZZZ', name: 'Zed Port' }]))
    const ports = await import('./ports/index.js')

    expect(await ports.list()).toEqual([{ code: 'GB ZZZ', name: 'Zed Port' }])
  })

  it('Should not re-fetch across multiple reader calls once loaded', async () => {
    process.env.STUB_MODE = 'false'
    const fetchMock = vi.fn(async () =>
      okResponse([{ code: 'GB ZZZ', name: 'Zed Port' }])
    )
    vi.stubGlobal('fetch', fetchMock)
    const ports = await import('./ports/index.js')

    await ports.list()
    await ports.label('GB ZZZ')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('Should re-attempt on a reader call after a prior load failure', async () => {
    process.env.STUB_MODE = 'false'
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('MDM down'))
      .mockImplementation(async () =>
        okResponse([{ code: 'GB ZZZ', name: 'Zed Port' }])
      )
    vi.stubGlobal('fetch', fetchMock)
    const ports = await import('./ports/index.js')

    await expect(ports.list()).rejects.toThrow()
    expect(await ports.list()).toEqual([{ code: 'GB ZZZ', name: 'Zed Port' }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('Should reject with a serverUnavailable Boom error on load failure', async () => {
    process.env.STUB_MODE = 'false'
    stubFetch(async () => ({ ok: false, status: 500, statusText: 'Boom' }))
    const ports = await import('./ports/index.js')

    await expect(ports.list()).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 503 }
    })
  })
})

// isStubMode's own unit test mocks config; these two run the real convict
// schema, so they are what proves the STUB_MODE environment variable actually
// reaches the services above.
describe('mode resolution', () => {
  it('Should default to real when the flag is unset', async () => {
    delete process.env.STUB_MODE
    const { isStubMode } = await import('../../common/services/mode.js')
    expect(isStubMode()).toBe(false)
  })

  it('Should select stub when the flag is set', async () => {
    process.env.STUB_MODE = 'true'
    const { isStubMode } = await import('../../common/services/mode.js')
    expect(isStubMode()).toBe(true)
  })
})
