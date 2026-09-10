import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { consignor } from '../../../../../obligations/index.js'
import * as addressBook from '../../../../../../../services/address-book/index.js'

import * as addressReturn from './controller.js'

const handler = addressReturn.routes[0].handler
const newAddressId = 'new-address-id'

const configure = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  buildDispatch(dispatchPages)
}

describe('GET /address-return', () => {
  beforeAll(configure)
  beforeEach(() => {
    store.clear()
    vi.restoreAllMocks()
  })

  it('redirects to the party picker when no address id is supplied', async () => {
    const result = await driveHandler(handler, {
      query: { 'fulfilment-id': consignor.id }
    })

    expect(result.response.redirect).toContain('/consignors/select')
  })

  it('commits the returned address id and redirects to the picker', async () => {
    vi.spyOn(addressBook, 'party').mockResolvedValue({
      id: newAddressId,
      name: 'New Farm',
      deleted: false,
      address: {
        addressLine1: '1 Test Lane',
        townOrCity: 'Carlisle',
        postalOrZipCode: 'CA1 1AA',
        country: 'United Kingdom'
      }
    })

    const result = await driveHandler(handler, {
      query: {
        'fulfilment-id': consignor.id,
        addressId: newAddressId
      }
    })

    expect(result.response.redirect).toContain('/consignors/select')
    expect(result.response.redirect).toContain(`selected=${newAddressId}`)
    expect(result.after.consignor.addressId).toBe(newAddressId)
  })
})
