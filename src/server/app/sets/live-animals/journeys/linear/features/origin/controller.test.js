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

const COUNTRY_FROM_LIST_MESSAGE = 'Select a country from the list'
const REGION_CODE_REQUIRED_MESSAGE = 'Enter the region of origin code'
const INTERNAL_REFERENCE_MAX_LENGTH = 58
const INTERNAL_REFERENCE_MAX_LENGTH_MESSAGE =
  'Internal reference must be 58 characters or less'

describe('POST /origin — invalid payload', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  const cases = [
    {
      name: 'countryOfOrigin outside the countries list',
      payload: {
        countryOfOrigin: 'XX',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'Imports456GB'
      },
      field: 'countryOfOrigin',
      message: COUNTRY_FROM_LIST_MESSAGE
    },
    {
      name: 'an internal reference over the length limit',
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'A'.repeat(INTERNAL_REFERENCE_MAX_LENGTH + 1)
      },
      field: 'internalReferenceNumber',
      message: INTERNAL_REFERENCE_MAX_LENGTH_MESSAGE
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

describe('POST /origin — an unanswered country still saves', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should keep the rest of the page and move on when no country is chosen', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'Imports456GB'
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.countryOfOrigin).toBe('')
    expect(result.after.internalReferenceNumber).toBe('Imports456GB')
    expect(result.after.regionOfOriginCodeRequirement).toBe('no')
  })

  it('Should save a page answered by nothing but the internal reference', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: '',
        internalReferenceNumber: 'Imports456GB'
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.internalReferenceNumber).toBe('Imports456GB')
    expect(result.after.countryOfOrigin).toBe('')
    expect(result.after.regionOfOriginCodeRequirement).toBe('')
  })

  it('Should store the region code without a prefix while no country is chosen', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCodeSuffix: '75',
        internalReferenceNumber: ''
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('75')
  })

  // The prefix-free region code is an intermediate value: it self-heals when
  // the user comes back to the page and chooses the country.
  it('Should join the country prefix once the country is filled in later', async () => {
    await driveHandler(post, {
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCodeSuffix: '75',
        internalReferenceNumber: ''
      }
    })

    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCodeSuffix: '75',
        internalReferenceNumber: ''
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('FR-75')
  })
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

  // The reference is whatever the user's own system calls the consignment, so
  // the punctuation their records use has to survive the page untouched.
  const punctuatedReferences = [
    'ACME-2026/01',
    'Acme ref 12',
    'ACME.2026.01',
    'ACME-2026/01 (batch 2)'
  ]

  it.each(punctuatedReferences)(
    'Should accept and save the internal reference %s',
    async (internalReferenceNumber) => {
      const result = await driveHandler(post, {
        payload: {
          countryOfOrigin: 'FR',
          regionOfOriginCodeRequirement: 'no',
          internalReferenceNumber
        }
      })

      expect(result.view).toBeUndefined()
      expect(result.after.internalReferenceNumber).toBe(internalReferenceNumber)
    }
  )

  it('Should accept an internal reference at the length limit', async () => {
    const atLimit = 'A'.repeat(INTERNAL_REFERENCE_MAX_LENGTH)
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: atLimit
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.internalReferenceNumber).toBe(atLimit)
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
      COUNTRY_FROM_LIST_MESSAGE
    )
  })
})
