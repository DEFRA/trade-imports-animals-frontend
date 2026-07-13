import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import {
  driveHandler,
  postHandlerEndingWith
} from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import * as addressBook from '../../services/address-book/index.js'

import * as createAddress from './create-address.controller.js'
import * as consignorsSelect from './consignors-select.controller.js'

const postCreate = postHandlerEndingWith(createAddress, 'addresses/create')
const postConsignorSpoke = postHandlerEndingWith(
  consignorsSelect,
  'consignors/select'
)

const validPayload = (overrides = {}) => ({
  for: 'consignor',
  nameOrOrganisationName: 'Created Farm Ltd',
  addressLine1: '99 New Lane',
  addressLine2: '',
  townOrCity: 'Carlisle',
  county: '',
  postalOrZipCode: 'CA1 1AA',
  country: 'United Kingdom',
  telephoneNumber: '01228 555 0101',
  emailAddress: 'farm@example.co.uk',
  ...overrides
})

describe('POST addresses/create — shared Standard Address Block form', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should copy the created address into the launching party and add it to that role of the address book only', async () => {
    const result = await driveHandler(postCreate, { payload: validPayload() })

    expect(result.response).toEqual({
      redirect: '/prototype-standalone/live-animals/addresses'
    })
    expect(result.after.consignor).toEqual({
      name: 'Created Farm Ltd',
      address: {
        addressLine1: '99 New Lane',
        addressLine2: '',
        townOrCity: 'Carlisle',
        county: '',
        postalOrZipCode: 'CA1 1AA',
        country: 'United Kingdom',
        telephoneNumber: '01228 555 0101',
        emailAddress: 'farm@example.co.uk'
      }
    })

    const consignorNames = addressBook
      .parties('consignor')
      .map((option) => option.name)
    expect(consignorNames).toContain('Created Farm Ltd')
    const importerNames = addressBook
      .parties('importer')
      .map((option) => option.name)
    expect(importerNames).not.toContain('Created Farm Ltd')
  })

  it('Should offer the created address in the launching spoke, where selecting it commits the same copy', async () => {
    await driveHandler(postCreate, {
      payload: validPayload({ nameOrOrganisationName: 'Second Created Ltd' })
    })
    const created = addressBook
      .parties('consignor')
      .find((option) => option.name === 'Second Created Ltd')

    const result = await driveHandler(postConsignorSpoke, {
      payload: { consignor: created.id }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.consignor.name).toBe('Second Created Ltd')
    expect(result.after.consignor.address.townOrCity).toBe('Carlisle')
  })

  it('Should reject a blank submit with an error per mandatory field and commit nothing', async () => {
    const result = await driveHandler(postCreate, {
      payload: {
        for: 'consignor',
        nameOrOrganisationName: '',
        addressLine1: '',
        addressLine2: '',
        townOrCity: '',
        county: '',
        postalOrZipCode: '',
        country: '',
        telephoneNumber: '',
        emailAddress: ''
      }
    })

    expect(Object.keys(result.view.context.errors)).toEqual([
      'nameOrOrganisationName',
      'addressLine1',
      'townOrCity',
      'postalOrZipCode',
      'country',
      'telephoneNumber',
      'emailAddress'
    ])
    expect(result.after.consignor).toBeUndefined()
  })

  it('Should redirect to the addresses landing page without saving when the launching party is unknown', async () => {
    const before = addressBook.parties('consignor').length
    const result = await driveHandler(postCreate, {
      payload: validPayload({ for: 'somewhereElse' })
    })

    expect(result.response).toEqual({
      redirect: '/prototype-standalone/live-animals/addresses'
    })
    expect(result.after).toEqual({})
    expect(addressBook.parties('consignor')).toHaveLength(before)
  })
})
