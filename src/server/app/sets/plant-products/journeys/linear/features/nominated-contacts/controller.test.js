import Hapi from '@hapi/hapi'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import * as kit from '../../../../../../shared/kit.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import { records } from '../../../../services/records/stub.js'
import * as nominatedContacts from './controller.js'
import { copy } from './copy/copy.en.js'

const get = nominatedContacts.routes.find(
  ({ method }) => method === 'GET'
).handler
const post = postHandlerOf(nominatedContacts)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const validPayload = (overrides = {}) => ({
  action: 'add',
  contactName: 'Alex Inspector',
  contactEmail: 'alex@example.com',
  contactTelephone: '',
  ...overrides
})

const contact = (name, overrides = {}) => ({
  contactName: name,
  contactEmail: `${name.toLowerCase().replaceAll(' ', '.')}@example.com`,
  contactIsAgent: false,
  ...overrides
})

describe('plant-products nominated-contacts controller', () => {
  let server

  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
  })

  beforeEach(async () => {
    enterSetContext('plant-products')
    await records.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })

  it('renders an empty entry form with zero saved rows and no phantom contact', async () => {
    const result = await drive(get)

    expect(result.view.context.values).toEqual({
      contactName: '',
      contactEmail: '',
      contactTelephone: '',
      contactIsAgent: false
    })
    expect(result.view.context.rows).toEqual([])
    expect(result.view.context.atMax).toBe(false)
  })

  it('renders every saved contact with its own values and position', async () => {
    const first = contact('Alex Inspector')
    const second = contact('Blair Broker', {
      contactEmail: undefined,
      contactTelephone: '+44 7700 900 982',
      contactIsAgent: true
    })
    const result = await drive(get, {
      seed: { nominatedContacts: [first, second] }
    })

    expect(result.view.context.rows).toEqual([
      {
        index: 0,
        number: 1,
        contactName: 'Alex Inspector',
        contactEmail: 'alex.inspector@example.com',
        contactTelephone: ''
      },
      {
        index: 1,
        number: 2,
        contactName: 'Blair Broker',
        contactEmail: '',
        contactTelephone: '+44 7700 900 982'
      }
    ])
  })

  it('appends exactly one cleaned contact and redirects to a fresh form', async () => {
    const result = await drive(post, {
      payload: validPayload({
        contactName: ' Alex Inspector ',
        contactEmail: ' alex@example.com ',
        contactIsAgent: 'true'
      })
    })

    expect(result.after).toEqual({
      nominatedContacts: [
        {
          contactName: 'Alex Inspector',
          contactEmail: 'alex@example.com',
          contactIsAgent: true
        }
      ]
    })
    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/nominated-contact$/
    )
  })

  it.each([
    {
      name: 'requires a name',
      overrides: { contactName: '' },
      field: 'contactName',
      message: copy.errors.contactNameRequired,
      raw: ''
    },
    {
      name: 'caps the name at 32 characters',
      overrides: { contactName: 'x'.repeat(33) },
      field: 'contactName',
      message: copy.errors.contactNameMax,
      raw: 'x'.repeat(33)
    },
    {
      name: 'rejects an invalid email address',
      overrides: { contactEmail: 'not-an-email' },
      field: 'contactEmail',
      message: copy.errors.contactEmailFormat,
      raw: 'not-an-email'
    },
    {
      name: 'caps the email address at 255 characters',
      overrides: { contactEmail: `${'a'.repeat(244)}@example.com` },
      field: 'contactEmail',
      message: copy.errors.contactEmailMax,
      raw: `${'a'.repeat(244)}@example.com`
    },
    {
      name: 'rejects an invalid mobile number',
      overrides: { contactEmail: '', contactTelephone: 'call me' },
      field: 'contactTelephone',
      message: copy.errors.contactTelephoneFormat,
      raw: 'call me'
    },
    {
      name: 'caps the mobile number at 30 characters',
      overrides: { contactEmail: '', contactTelephone: '1'.repeat(31) },
      field: 'contactTelephone',
      message: copy.errors.contactTelephoneMax,
      raw: '1'.repeat(31)
    },
    {
      name: 'requires either email or mobile number',
      overrides: { contactEmail: '', contactTelephone: '' },
      field: 'contactEmail',
      message: copy.errors.contactMethodRequired,
      raw: ''
    }
  ])(
    '$name, preserves all raw values and commits nothing',
    async (testCase) => {
      const payload = validPayload({
        contactIsAgent: 'true',
        ...testCase.overrides
      })
      const result = await drive(post, { payload })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[testCase.field]).toBe(testCase.message)
      expect(result.view.context.values[testCase.field]).toBe(testCase.raw)
      expect(result.view.context.values).toEqual({
        contactName: payload.contactName,
        contactEmail: payload.contactEmail,
        contactTelephone: payload.contactTelephone,
        contactIsAgent: true
      })
      expect(result.after).toEqual({})
    }
  )

  it('removes the middle contact and preserves the exact survivors in order', async () => {
    const first = contact('Alex Inspector')
    const middle = contact('Blair Broker')
    const last = contact('Casey Coordinator')
    const result = await drive(post, {
      seed: { nominatedContacts: [first, middle, last] },
      payload: { action: 'remove:1' }
    })

    expect(result.after.nominatedContacts).toEqual([first, last])
    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/nominated-contact$/
    )
  })

  it.each(['remove:3', 'remove:1.5', 'remove:not-a-number'])(
    'refuses the forged or stale index %s without touching the store',
    async (action) => {
      const seed = { nominatedContacts: [contact('Alex Inspector')] }
      const result = await drive(post, { seed, payload: { action } })

      expect(result.response.statusCode).toBe(400)
      expect(result.after).toEqual(seed)
    }
  )

  it('renders the maximum state at five contacts and rejects a stale sixth add without a write', async () => {
    const saved = Array.from({ length: 5 }, (_, index) =>
      contact(`Contact ${index + 1}`)
    )
    const getResult = await drive(get, {
      seed: { nominatedContacts: saved }
    })
    const postResult = await drive(post, {
      seed: { nominatedContacts: saved },
      payload: validPayload({ contactName: 'Sixth Contact' })
    })

    expect(getResult.view.context.atMax).toBe(true)
    expect(getResult.view.context.rows).toHaveLength(5)
    expect(postResult.after.nominatedContacts).toEqual(saved)
    expect(postResult.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/nominated-contact$/
    )
  })

  it('continues with zero contacts without validating or writing', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(post, { payload: { action: 'continue' } })

    expect(result.after).toEqual({})
    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('lets the hub exit win without calling nextTarget', async () => {
    const nextTarget = vi.spyOn(kit, 'nextTarget')
    const result = await drive(post, {
      payload: { action: 'continue', exit: 'hub' }
    })

    expect(result.after).toEqual({})
    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+$/
    )
    expect(nextTarget).not.toHaveBeenCalled()
  })

  it('renders raw values and a recoverable add error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const payload = validPayload({ contactName: ' Alex Inspector ' })
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.values.contactName).toBe(' Alex Inspector ')
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual({})
  })

  it('keeps the collection unchanged on a recoverable remove error', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const seed = { nominatedContacts: [contact('Alex Inspector')] }
    const result = await drive(post, {
      seed,
      payload: { action: 'remove:0' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual(seed)
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(drive(post, { payload: validPayload() })).rejects.toThrow(
      'programming failure'
    )
  })
})
