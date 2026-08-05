import { afterEach, describe, expect, it, vi } from 'vitest'

import { add, find, list } from './index.js'

const sessionRequest = () => {
  const values = new Map()
  return {
    yar: {
      get: (key) => values.get(key),
      set: (key, value) => values.set(key, value)
    }
  }
}

const CANNED_IDS = Array.from(
  { length: 12 },
  (_unused, index) => `example-consignor-${String(index + 1).padStart(2, '0')}`
)

const newConsignor = {
  name: 'Fresh Produce Co',
  telephone: '01632 960777',
  email: 'fresh@example.com',
  address: {
    addressLine1: '99 Example Street',
    city: 'Example City',
    postcode: 'ZZ99 99',
    country: 'NL'
  }
}

// PLANT_PRODUCTS_MODE unset is the default (services/mode.js resolves it to
// 'real') and it is what the workspace stack runs, so an empty picker there is
// the failure this table exists to catch.
const liveModeSuffix = (liveMode) =>
  liveMode ? ` with LIVE_ANIMALS_MODE=${liveMode}` : ''

const modeCases = [
  { name: 'PLANT_PRODUCTS_MODE unset' },
  { name: 'PLANT_PRODUCTS_MODE=real', plantMode: 'real' },
  { name: 'PLANT_PRODUCTS_MODE=stub', plantMode: 'stub' }
].flatMap((plantCase) =>
  [undefined, 'real'].map((liveMode) => ({
    name: `${plantCase.name}${liveModeSuffix(liveMode)}`,
    plantMode: plantCase.plantMode,
    liveMode
  }))
)

const applyMode = ({ plantMode, liveMode }) => {
  vi.stubEnv('PLANT_PRODUCTS_MODE', plantMode)
  vi.stubEnv('LIVE_ANIMALS_MODE', liveMode)
}

describe('plant-products address book', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(modeCases)(
    'lists the twelve canned consignors with $name',
    async (modeCase) => {
      applyMode(modeCase)

      expect((await list(sessionRequest())).map(({ id }) => id)).toEqual(
        CANNED_IDS
      )
    }
  )

  it.each(modeCases)(
    'finds a canned record and adds a session record with $name',
    async (modeCase) => {
      applyMode(modeCase)
      const request = sessionRequest()

      await expect(
        find(request, 'example-consignor-03')
      ).resolves.toMatchObject({ name: 'Example Consignor 03 (sample data)' })
      await expect(find(request, 'no-such-consignor')).resolves.toBeUndefined()

      const created = await add(request, newConsignor)

      expect(created.id).toBe('created-consignor-1')
      expect((await list(request)).map(({ id }) => id)).toEqual([
        ...CANNED_IDS,
        'created-consignor-1'
      ])
    }
  )
})
