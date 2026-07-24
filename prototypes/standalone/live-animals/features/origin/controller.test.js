import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { driveHandler, postHandlerOf } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import * as countries from '../../services/countries/index.js'

import * as origin from './controller.js'

const post = postHandlerOf(origin)

describe('POST /origin — invalid payload', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  const cases = [
    {
      name: 'blank countryOfOrigin',
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'Imports456GB'
      },
      field: 'countryOfOrigin',
      message: 'Select the country where the animal originates from'
    },
    {
      name: 'countryOfOrigin outside the countries list',
      payload: {
        countryOfOrigin: 'XX',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'Imports456GB'
      },
      field: 'countryOfOrigin',
      message: 'Select the country where the animal originates from'
    },
    {
      name: 'invalid-character internalReferenceNumber',
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'bad ref!'
      },
      field: 'internalReferenceNumber',
      message:
        'Internal reference must only contain letters, numbers and underscores'
    }
  ]

  it.each(cases)(
    'Should re-render $name with its message and commit nothing',
    async ({ payload, field, message }) => {
      const result = await driveHandler(post, { payload })
      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[field]).toBe(message)
      expect(result.after).toEqual(result.before)
    }
  )
})

describe('POST /origin — valid internal reference', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should accept and save an internal reference containing an underscore', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'Imports456_GB'
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.internalReferenceNumber).toBe('Imports456_GB')
  })
})

describe('GET /origin — server-rendered select data (no-JS path)', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the placeholder, divider and full country list to the select', async () => {
    const get = origin.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    const items = result.view.context.countryItems
    expect(items[0]).toEqual({ value: '', text: 'Select a country' })
    expect(items[1]).toEqual({ value: '', text: '──────────', disabled: true })
    expect(items).toContainEqual({ value: 'FR', text: 'France' })
  })
})

describe('POST /origin — country membership follows the primed list', () => {
  const originalMode = process.env.LIVE_ANIMALS_MODE

  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  afterAll(() => {
    vi.unstubAllGlobals()
    if (originalMode === undefined) delete process.env.LIVE_ANIMALS_MODE
    else process.env.LIVE_ANIMALS_MODE = originalMode
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

    const accepted = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'ZZ',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: ''
      }
    })
    expect(accepted.view).toBeUndefined()
    expect(accepted.after.countryOfOrigin).toBe('ZZ')

    const rejected = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: ''
      }
    })
    expect(rejected.view.context.errors.countryOfOrigin).toBe(
      'Select the country where the animal originates from'
    )
  })
})
