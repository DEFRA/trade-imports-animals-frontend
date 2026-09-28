import { afterEach, describe, expect, it, vi } from 'vitest'

import { assembleFulfilments } from '../../../src/server/app/bridge/assemble-fulfilments.js'
import * as countries from '../../../src/server/app/services/countries/index.js'
import { countryStale } from './country-stale.js'

const REFERENCE_NUMBER = 'GBN-AG-26-TEST01'
const STALE_CODE = 'ZZ'

const mockCollection = (updateOneResult) => ({
  updateOne: vi.fn().mockResolvedValue(updateOneResult)
})

describe('#countryStale', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Should still get a non-empty contribution from assembleFulfilments for the sentinel', () => {
    // Pins the regression: if a feature binding starts validating on the
    // write path and returns {} for a nonsense code, the scenario silently
    // no-ops. Fail loud instead.
    const contributions = assembleFulfilments({ countryOfOrigin: STALE_CODE })
    expect(Object.keys(contributions).length).toBeGreaterThan(0)
  })

  it('Should refuse to run when the sentinel code is in the current catalogue', async () => {
    vi.spyOn(countries, 'originCountries').mockResolvedValue([
      { value: STALE_CODE, text: 'Ziggurat' }
    ])
    const notifications = mockCollection({ matchedCount: 1 })
    await expect(
      countryStale.mutate(notifications, REFERENCE_NUMBER)
    ).rejects.toThrow(/is now in the catalogue/)
    expect(notifications.updateOne).not.toHaveBeenCalled()
  })

  it('Should $set the sentinel value on the countryOfOrigin fulfilment', async () => {
    const notifications = mockCollection({ matchedCount: 1 })
    await countryStale.mutate(notifications, REFERENCE_NUMBER)
    expect(notifications.updateOne).toHaveBeenCalledTimes(1)
    const [filter, update] = notifications.updateOne.mock.calls[0]
    expect(filter).toMatchObject({ referenceNumber: REFERENCE_NUMBER })
    expect(filter['fulfilments.obligationId']).toBeTruthy()
    expect(update).toEqual({ $set: { 'fulfilments.$.value': STALE_CODE } })
  })

  it('Should throw when the notification has no matching fulfilment', async () => {
    const notifications = mockCollection({ matchedCount: 0 })
    await expect(
      countryStale.mutate(notifications, REFERENCE_NUMBER)
    ).rejects.toThrow(/has no .* fulfilment to rewrite/)
  })
})
