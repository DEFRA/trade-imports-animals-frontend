import { describe, expect, it, vi } from 'vitest'

import { obligations } from '../../../src/server/app/sets/live-animals/obligations/index.js'
import { unknownObligation } from './unknown-obligation.js'

const REFERENCE_NUMBER = 'GBN-AG-26-TEST01'

const mockCollection = (updateResult) => ({
  updateOne: vi.fn().mockResolvedValue(updateResult)
})

describe('#unknownObligation', () => {
  it('Should confirm the ghost id is not currently in the manifest', () => {
    // Pins the regression: if the ghost id ever gets adopted by a real
    // obligation, the scenario would exercise a known path, not an unknown
    // one. Verified from the scenario's own assertion here so the failure
    // surfaces in test, not at first invocation.
    const ghost = 'eudpa-573-ghost-obligation-abcdef'
    expect(obligations.find((o) => o.id === ghost)).toBeUndefined()
  })

  it('Should $push a fulfilment with the ghost obligation id', async () => {
    const notifications = mockCollection({ matchedCount: 1 })
    await unknownObligation.mutate(notifications, REFERENCE_NUMBER)
    expect(notifications.updateOne).toHaveBeenCalledTimes(1)
    const [filter, update] = notifications.updateOne.mock.calls[0]
    expect(filter).toEqual({ referenceNumber: REFERENCE_NUMBER })
    expect(update.$push.fulfilments.obligationId).toMatch(
      /^eudpa-573-ghost-obligation-/
    )
  })

  it('Should throw when the notification does not exist', async () => {
    const notifications = mockCollection({ matchedCount: 0 })
    await expect(
      unknownObligation.mutate(notifications, REFERENCE_NUMBER)
    ).rejects.toThrow(/not found in the notifications collection/)
  })
})
