import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalMode = process.env.LIVE_ANIMALS_MODE

const okResponse = (body) => ({ ok: true, json: async () => body })

const stubFetch = (impl) => vi.stubGlobal('fetch', vi.fn(impl))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalMode === undefined) delete process.env.LIVE_ANIMALS_MODE
  else process.env.LIVE_ANIMALS_MODE = originalMode
})

describe('countries client', () => {
  it('Should parse a fetched [{code,name}] payload', async () => {
    stubFetch(async () => okResponse([{ code: 'ZZ', name: 'Zedland' }]))
    const { fetchCountries } = await import('./countries/client.js')
    await expect(fetchCountries()).resolves.toEqual([
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

describe('countries service — default stub mode', () => {
  it('Should serve stub data through the accessors without priming', async () => {
    delete process.env.LIVE_ANIMALS_MODE
    const countries = await import('./countries/index.js')
    expect(countries.originLabel('AT')).toBe('Austria')
    expect(countries.originCountries()).toContainEqual({
      value: 'AT',
      text: 'Austria'
    })
  })

  it('Should treat prime() as a no-op in stub mode (no fetch, stub retained)', async () => {
    delete process.env.LIVE_ANIMALS_MODE
    stubFetch(async () => okResponse([{ code: 'ZZ', name: 'Zedland' }]))
    const countries = await import('./countries/index.js')
    await countries.prime()
    expect(fetch).not.toHaveBeenCalled()
    expect(countries.originLabel('AT')).toBe('Austria')
    expect(countries.originLabel('ZZ')).toBeUndefined()
  })
})

describe('countries service — real mode', () => {
  it('Should replace the cache on prime() so sync accessors serve fetched data', async () => {
    process.env.LIVE_ANIMALS_MODE = 'real'
    stubFetch(async () => okResponse([{ code: 'ZZ', name: 'Zedland' }]))
    const countries = await import('./countries/index.js')

    expect(countries.originLabel('ZZ')).toBeUndefined()
    await countries.prime()

    expect(countries.originLabel('ZZ')).toBe('Zedland')
    expect(countries.originLabel('AT')).toBeUndefined()
    expect(countries.originCountries()).toEqual([
      { value: 'ZZ', text: 'Zedland' }
    ])
    expect(countries.addressCountries()).toEqual(['United Kingdom', 'Zedland'])
  })
})

describe('ports service — default stub mode', () => {
  it('Should serve stub data through list() without priming', async () => {
    delete process.env.LIVE_ANIMALS_MODE
    const ports = await import('./ports/index.js')
    expect(ports.list()).toContainEqual({
      code: 'GB ABD',
      name: 'Aberdeen Harbour'
    })
  })
})

describe('ports service — real mode', () => {
  it('Should replace the cache on prime() so list() serves fetched ports', async () => {
    process.env.LIVE_ANIMALS_MODE = 'real'
    stubFetch(async () => okResponse([{ code: 'GB ZZZ', name: 'Zed Port' }]))
    const ports = await import('./ports/index.js')

    await ports.prime()

    expect(ports.list()).toEqual([{ code: 'GB ZZZ', name: 'Zed Port' }])
  })
})
