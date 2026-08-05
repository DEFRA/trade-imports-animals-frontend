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
import * as contact from './controller.js'
import { copy } from './copy/copy.en.js'

const get = contact.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(contact)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const CONTACT_NAME = 'Isabel Irwin'
const CONTACT_EMAIL = 'isabel@example.com'
const CONTACT_TELEPHONE = '+44 7700 900 982'
const UNTRIMMED_CONTACT_NAME = `  ${CONTACT_NAME}  `
const UNTRIMMED_CONTACT_EMAIL = ` ${CONTACT_EMAIL} `
const UNTRIMMED_CONTACT_TELEPHONE = ` ${CONTACT_TELEPHONE} `
const NEXT_TARGET_PATH = '/plant-products/notifications/next-target'

const validPayload = (overrides = {}) => ({
  responsiblePersonName: CONTACT_NAME,
  responsiblePersonEmail: CONTACT_EMAIL,
  responsiblePersonTelephone: '',
  ...overrides
})

describe('plant-products contact controller', () => {
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

  it('prefills all three responsible-person fields', async () => {
    const result = await drive(get, {
      seed: {
        responsiblePersonName: CONTACT_NAME,
        responsiblePersonEmail: CONTACT_EMAIL,
        responsiblePersonTelephone: CONTACT_TELEPHONE
      }
    })

    expect(result.view.context.values).toEqual({
      responsiblePersonName: CONTACT_NAME,
      responsiblePersonEmail: CONTACT_EMAIL,
      responsiblePersonTelephone: CONTACT_TELEPHONE
    })
  })

  it.each([
    {
      name: 'requires a name',
      overrides: { responsiblePersonName: '' },
      field: 'responsiblePersonName',
      message: copy.errors.nameRequired
    },
    {
      name: 'limits the name to 32 characters',
      overrides: { responsiblePersonName: 'N'.repeat(33) },
      field: 'responsiblePersonName',
      message: copy.errors.nameMax
    },
    {
      name: 'rejects an invalid email address',
      overrides: { responsiblePersonEmail: 'not-an-email' },
      field: 'responsiblePersonEmail',
      message: copy.errors.emailFormat
    },
    {
      name: 'limits the email address to 255 characters',
      overrides: {
        responsiblePersonEmail: `${'a'.repeat(244)}@example.com`
      },
      field: 'responsiblePersonEmail',
      message: copy.errors.emailMax
    },
    {
      name: 'rejects telephone letters',
      overrides: {
        responsiblePersonEmail: '',
        responsiblePersonTelephone: '07700 CALL ME'
      },
      field: 'responsiblePersonTelephone',
      message: copy.errors.telephoneFormat
    },
    {
      name: 'limits the mobile number to 30 characters',
      overrides: {
        responsiblePersonEmail: '',
        responsiblePersonTelephone: '1'.repeat(31)
      },
      field: 'responsiblePersonTelephone',
      message: copy.errors.telephoneMax
    }
  ])('$name and commits nothing', async (testCase) => {
    const payload = validPayload(testCase.overrides)
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors[testCase.field]).toBe(testCase.message)
    expect(result.view.context.values).toEqual(payload)
    expect(result.after).toEqual({})
  })

  it('requires at least one of email and telephone and anchors the error to email', async () => {
    const payload = validPayload({
      responsiblePersonEmail: '',
      responsiblePersonTelephone: ''
    })
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      responsiblePersonEmail: copy.errors.emailOrTelephoneRequired
    })
    expect(result.view.context.values).toEqual(payload)
    expect(result.after).toEqual({})
  })

  it('preserves every raw value on an error and does not commit', async () => {
    const payload = {
      responsiblePersonName: UNTRIMMED_CONTACT_NAME,
      responsiblePersonEmail: ' raw-email ',
      responsiblePersonTelephone: ' 07700 900 982 '
    }
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.values).toEqual(payload)
    expect(result.after).toEqual({})
  })

  it('commits trimmed name and email without an empty telephone and redirects', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue(NEXT_TARGET_PATH)
    const result = await drive(post, {
      payload: validPayload({
        responsiblePersonName: UNTRIMMED_CONTACT_NAME,
        responsiblePersonEmail: UNTRIMMED_CONTACT_EMAIL
      })
    })

    expect(result.after).toEqual({
      responsiblePersonName: CONTACT_NAME,
      responsiblePersonEmail: CONTACT_EMAIL
    })
    expect(result.after).not.toHaveProperty('responsiblePersonTelephone')
    expect(result.response).toEqual({
      redirect: NEXT_TARGET_PATH
    })
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('commits trimmed name and telephone without an empty email', async () => {
    vi.spyOn(kit, 'nextTarget').mockResolvedValue(NEXT_TARGET_PATH)
    const result = await drive(post, {
      payload: validPayload({
        responsiblePersonEmail: '',
        responsiblePersonTelephone: UNTRIMMED_CONTACT_TELEPHONE
      })
    })

    expect(result.after).toEqual({
      responsiblePersonName: CONTACT_NAME,
      responsiblePersonTelephone: CONTACT_TELEPHONE
    })
    expect(result.after).not.toHaveProperty('responsiblePersonEmail')
  })

  it('renders raw values and a recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const payload = validPayload({
      responsiblePersonName: UNTRIMMED_CONTACT_NAME
    })
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.values).toEqual(payload)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual({})
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
