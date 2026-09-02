import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import * as countries from '../../../../../../services/countries/index.js'
import { config } from '../../../../../../../../config/config.js'

import * as origin from './controller.js'

const post = postHandlerOf(origin)
const get = origin.routes.find((route) => route.method === 'GET').handler

const COUNTRY_REQUIRED_MESSAGE =
  'Select the country where the animal originates from'
const REGION_CODE_REQUIRED_MESSAGE = 'Enter the region of origin code'

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
      message: COUNTRY_REQUIRED_MESSAGE
    },
    {
      name: 'countryOfOrigin outside the countries list',
      payload: {
        countryOfOrigin: 'XX',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'Imports456GB'
      },
      field: 'countryOfOrigin',
      message: COUNTRY_REQUIRED_MESSAGE
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

describe('POST /origin — region of origin code prefix and suffix', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  const postSuffix = (regionOfOriginCodeSuffix) =>
    driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCodeSuffix,
        internalReferenceNumber: ''
      }
    })

  it('Should store the country prefix joined to the typed part in upper case', async () => {
    const result = await postSuffix('75')

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('FR-75')
  })

  it('Should accept a region part longer than two characters', async () => {
    const result = await postSuffix('dub')

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('FR-DUB')
  })

  it('Should not double the prefix when the typed part already carries it', async () => {
    const result = await postSuffix('fr-75')

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('FR-75')
  })

  it('Should hold the user on the page when the typed part is blank', async () => {
    const result = await postSuffix('   ')

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_REQUIRED_MESSAGE
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should hold the user on the page when the typed part is only the prefix', async () => {
    const result = await postSuffix('fr-')

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_REQUIRED_MESSAGE
    )
    expect(result.view.context.values.regionOfOriginCodeSuffix).toBe('fr-')
    expect(result.after).toEqual(result.before)
  })

  it('Should hold the user on the page when the box was never submitted', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes',
        internalReferenceNumber: ''
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_REQUIRED_MESSAGE
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should let a blank box through when the answer is No', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        regionOfOriginCodeSuffix: '',
        internalReferenceNumber: ''
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('')
  })

  it('Should reject a typed part over 5 characters even when the answer is No', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        regionOfOriginCodeSuffix: 'ABCDEF',
        internalReferenceNumber: ''
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      'Region of origin code must be 5 characters or less'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should reject a typed part over 5 characters and commit nothing', async () => {
    const result = await postSuffix('ABCDEF')

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      'Region of origin code must be 5 characters or less'
    )
    expect(result.view.context.regionCodePrefix).toBe('FR')
    expect(result.view.context.values.regionOfOriginCodeSuffix).toBe('ABCDEF')
    expect(result.after).toEqual(result.before)
  })
})

describe('GET /origin — region of origin code splits back into its two parts', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should render the country as the prefix and only the rest in the box', async () => {
    const result = await driveHandler(get, {
      seed: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCode: 'FR-75'
      }
    })

    expect(result.view.context.regionCodePrefix).toBe('FR')
    expect(result.view.context.values.regionOfOriginCodeSuffix).toBe('75')
  })

  it('Should render no prefix before a country has been chosen', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.regionCodePrefix).toBe('')
    expect(result.view.context.values.regionOfOriginCodeSuffix).toBe('')
  })
})

describe('GET /origin — server-rendered select data (no-JS path)', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the placeholder and full country list to the select', async () => {
    const result = await driveHandler(get)
    const items = result.view.context.countryItems
    expect(items[0]).toEqual({ value: '', text: 'Select a country' })
    expect(items).toContainEqual({ value: 'FR', text: 'France' })
  })

  it('Should offer no unselectable filler rows for the type-ahead to search', async () => {
    const result = await driveHandler(get)
    const items = result.view.context.countryItems
    expect(items.filter((item) => item.disabled)).toEqual([])
    expect(items.filter((item) => item.value === '')).toHaveLength(1)
  })
})

describe('POST /origin — country membership follows the primed list', () => {
  const originalMode = config.get('stubMode')

  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  afterAll(() => {
    vi.unstubAllGlobals()
    config.set('stubMode', originalMode)
  })

  it('Should validate against the list as primed at POST time, not as imported', async () => {
    config.set('stubMode', false)
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
      COUNTRY_REQUIRED_MESSAGE
    )
  })
})
