import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerEndingWith
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import * as addressBook from '../../../../../../../services/address-book/index.js'
import * as countries from '../../../../../../../services/countries/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'

import * as createAddress from './create-address.controller.js'
import * as partyPicker from '../party-picker/party-picker.controller.js'
import { CONTACT_PARTY, PARTIES, partyOf } from '../parties.js'

const postCreate = postHandlerEndingWith(createAddress, 'addresses/create')
const postConsignorSpoke = postHandlerEndingWith(
  partyPicker,
  'consignors/select'
)

const CREATED_FARM_NAME = 'Created Farm Ltd'
const CREATED_ADDRESS_LINE_1 = '99 New Lane'
const CREATED_COUNTRY = 'United Kingdom'
const CREATED_TELEPHONE_NUMBER = '01228 555 0101'
const CREATED_EMAIL_ADDRESS = 'farm@example.co.uk'
const SECOND_CREATED_NAME = 'Second Created Ltd'
const CREATED_CONTACT_NAME = 'Created Contact Ltd'

const validPayload = (overrides = {}) => ({
  for: 'consignor',
  nameOrOrganisationName: CREATED_FARM_NAME,
  addressLine1: CREATED_ADDRESS_LINE_1,
  addressLine2: '',
  townOrCity: 'Carlisle',
  county: '',
  postalOrZipCode: 'CA1 1AA',
  country: CREATED_COUNTRY,
  telephoneNumber: CREATED_TELEPHONE_NUMBER,
  emailAddress: CREATED_EMAIL_ADDRESS,
  ...overrides
})

describe('POST addresses/create — shared Standard Address Block form', () => {
  beforeAll(() => {
    configureRecords('live-animals', recordsStub)
    configureSession('live-animals', sessionStub)
    buildDispatch('live-animals', dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should copy the created address into the launching party and add it to that role of the address book only', async () => {
    const result = await driveHandler(postCreate, { payload: validPayload() })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'addresses')
    })
    expect(result.after.consignor).toEqual({
      name: CREATED_FARM_NAME,
      address: {
        addressLine1: CREATED_ADDRESS_LINE_1,
        addressLine2: '',
        townOrCity: 'Carlisle',
        county: '',
        postalOrZipCode: 'CA1 1AA',
        country: CREATED_COUNTRY,
        telephoneNumber: CREATED_TELEPHONE_NUMBER,
        emailAddress: CREATED_EMAIL_ADDRESS
      }
    })

    const consignorNames = addressBook
      .parties('consignor')
      .map((option) => option.name)
    expect(consignorNames).toContain(CREATED_FARM_NAME)
    const importerNames = addressBook
      .parties('importer')
      .map((option) => option.name)
    expect(importerNames).not.toContain(CREATED_FARM_NAME)
  })

  it('Should offer the created address in the launching spoke, where selecting it commits the same copy', async () => {
    await driveHandler(postCreate, {
      payload: validPayload({ nameOrOrganisationName: SECOND_CREATED_NAME })
    })
    const created = addressBook
      .parties('consignor')
      .find((option) => option.name === SECOND_CREATED_NAME)

    const result = await driveHandler(postConsignorSpoke, {
      payload: { action: 'save', party: created.id }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.consignor.name).toBe(SECOND_CREATED_NAME)
    expect(result.after.consignor.address.townOrCity).toBe('Carlisle')
  })

  it('Should resolve contact separately from the five hub spokes, copy its new address and return to the contact page', async () => {
    expect(partyOf('contactAddress')).toBe(CONTACT_PARTY)
    expect(PARTIES).toHaveLength(5)
    expect(PARTIES).not.toContain(CONTACT_PARTY)

    const result = await driveHandler(postCreate, {
      payload: validPayload({
        for: 'contactAddress',
        nameOrOrganisationName: CREATED_CONTACT_NAME
      })
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'consignment/contact/select')
    })
    expect(result.after.contactAddress).toEqual({
      name: CREATED_CONTACT_NAME,
      address: {
        addressLine1: CREATED_ADDRESS_LINE_1,
        addressLine2: '',
        townOrCity: 'Carlisle',
        county: '',
        postalOrZipCode: 'CA1 1AA',
        country: CREATED_COUNTRY,
        telephoneNumber: CREATED_TELEPHONE_NUMBER,
        emailAddress: CREATED_EMAIL_ADDRESS
      }
    })
    expect(
      addressBook
        .parties('contact')
        .some((option) => option.name === CREATED_CONTACT_NAME)
    ).toBe(true)
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

    expect(result.response.statusCode).toBe(400)
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
      redirect: pagePath(result.journeyId, 'addresses')
    })
    expect(result.after).toEqual({})
    expect(addressBook.parties('consignor')).toHaveLength(before)
  })
})

describe('POST addresses/create — country membership follows the primed list', () => {
  const originalMode = process.env.LIVE_ANIMALS_MODE

  beforeAll(() => {
    configureRecords('live-animals', recordsStub)
    configureSession('live-animals', sessionStub)
    buildDispatch('live-animals', dispatchPages)
  })
  beforeEach(() => store.clear())

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalMode === undefined) {
      delete process.env.LIVE_ANIMALS_MODE
    } else {
      process.env.LIVE_ANIMALS_MODE = originalMode
    }
  })

  it('Should validate against the list as primed at POST time, not as imported', async () => {
    process.env.LIVE_ANIMALS_MODE = 'real'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => [{ code: 'ZZ', name: 'Zedland' }]
      }))
    )
    await countries.prime()

    const accepted = await driveHandler(postCreate, {
      payload: validPayload({ country: 'Zedland' })
    })
    expect(accepted.view).toBeUndefined()
    expect(accepted.after.consignor.address.country).toBe('Zedland')

    const rejected = await driveHandler(postCreate, {
      payload: validPayload({ country: 'France' })
    })
    expect(rejected.view.context.errors.country).toBe(
      'Select a country from the list'
    )
  })
})
