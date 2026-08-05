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
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../../../../../engine/test-support.js'
import { projectAnswers } from '../../../../../../bridge/fulfilments/index.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import * as kit from '../../../../../../shared/kit.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import { records } from '../../../../services/records/stub.js'
import { arrivalDate, arrivalTime } from '../../../../obligations/index.js'
import * as transport from './controller.js'
import { copy } from './copy/copy.en.js'

const SET_ID = 'plant-products'
const SUITE = 'plant-products transport controller'
const ADD_CONTAINER = 'add-container'

const get = transport.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(transport)
const drive = (handler, options) =>
  withSetContext(SET_ID, () => driveHandler(handler, options))

const utcDay = (offset = 0) => {
  const now = new Date()
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)
  )
  return {
    day: String(date.getUTCDate()),
    month: String(date.getUTCMonth() + 1),
    year: String(date.getUTCFullYear()),
    iso: date.toISOString().slice(0, 10)
  }
}

const validPayload = (overrides = {}) => {
  const date = utcDay(1)
  return {
    borderControlPost: 'GBLHR4PP',
    inspectionPremises: '',
    meansOfTransport: 'ROAD_VEHICLE',
    transportIdentification: 'AB12 CDE',
    transportDocumentReference: 'CMR-123',
    'arrivalDate-day': date.day,
    'arrivalDate-month': date.month,
    'arrivalDate-year': date.year,
    'arrivalTime-hour': '14',
    'arrivalTime-minute': '50',
    usesContainers: 'false',
    ...overrides
  }
}

const container = {
  containerNumber: 'CONT-1',
  sealNumber: 'SEAL-1',
  officialSeal: true
}

const setupTransportServer = () => {
  let server

  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
  })

  beforeEach(async () => {
    enterSetContext(SET_ID)
    await records.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })
}

describe(`${SUITE} — prefill, border control post and premises`, () => {
  setupTransportServer()

  it('prefills every field, BCP-filtered premises and collection rows on GET', async () => {
    const result = await drive(get, {
      seed: {
        borderControlPost: 'CONPNT',
        inspectionPremises: 'INSPBER1',
        meansOfTransport: 'VESSEL',
        transportIdentification: 'FERRY-1',
        transportDocumentReference: 'BOL-1',
        arrivalDate: utcDay(1).iso,
        arrivalTime: '09:05',
        usesContainers: true,
        containers: [container]
      }
    })

    expect(result.view.context.values).toMatchObject({
      borderControlPost: 'CONPNT',
      inspectionPremises: 'INSPBER1',
      meansOfTransport: 'VESSEL',
      transportIdentification: 'FERRY-1',
      transportDocumentReference: 'BOL-1',
      arrivalTime: { hour: '09', minute: '05' },
      usesContainers: true
    })
    expect(result.view.context.premisesItems.map(({ value }) => value)).toEqual(
      ['', 'INSPBAR1', 'INSPBER1']
    )
    expect(result.view.context.rows).toEqual([
      {
        index: 0,
        containerNumber: 'CONT-1',
        sealNumber: 'SEAL-1',
        officialSeal: 'Yes'
      }
    ])
  })

  it('leaves both usesContainers radios unanswered on an empty GET', async () => {
    const result = await drive(get)

    expect(result.view.context.values.usesContainers).toBeUndefined()
    expect(result.view.context.showContainers).toBe(false)
  })

  it.each([
    ['empty', '', copy.errors.bcpRequired],
    ['forged', 'NOT-A-BCP', copy.errors.bcpRequired]
  ])('rejects an %s BCP', async (_name, borderControlPost, message) => {
    const result = await drive(post, {
      payload: validPayload({ borderControlPost })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.borderControlPost).toBe(message)
    expect(result.after).toEqual({})
  })

  it('requires premises when the POSTed BCP offers premises', async () => {
    const result = await drive(post, {
      payload: validPayload({
        borderControlPost: 'CONPNT',
        inspectionPremises: ''
      })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.inspectionPremises).toBe(
      copy.errors.premisesRequired
    )
    expect(result.view.context.showPremises).toBe(true)
    expect(result.after).toEqual({})
  })

  it('rejects premises outside the POSTed BCP allowlist', async () => {
    const result = await drive(post, {
      payload: validPayload({
        borderControlPost: 'GBLHR4PP',
        inspectionPremises: 'INSPBAR1'
      })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.inspectionPremises).toBe(
      copy.errors.premisesRequired
    )
    expect(result.view.context.values.inspectionPremises).toBe('INSPBAR1')
    expect(result.after).toEqual({})
  })
})

describe(`${SUITE} — means of transport, identification and arrival`, () => {
  setupTransportServer()

  it('requires a means of transport from the fixture', async () => {
    const result = await drive(post, {
      payload: validPayload({ meansOfTransport: '' })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.meansOfTransport).toBe(
      copy.errors.meansRequired
    )
  })

  it.each([
    [
      'empty identification',
      { transportIdentification: '' },
      'transportIdentification',
      copy.errors.identificationRequired
    ],
    [
      'long identification',
      { transportIdentification: 'I'.repeat(51) },
      'transportIdentification',
      copy.errors.identificationMaxLength
    ],
    [
      'empty document reference',
      { transportDocumentReference: '' },
      'transportDocumentReference',
      copy.errors.documentReferenceRequired
    ],
    [
      'long document reference',
      { transportDocumentReference: 'D'.repeat(33) },
      'transportDocumentReference',
      copy.errors.documentReferenceMaxLength
    ]
  ])('rejects an %s', async (_name, overrides, field, message) => {
    const result = await drive(post, {
      payload: validPayload(overrides)
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors[field]).toBe(message)
    expect(result.view.context.values[field]).toBe(overrides[field])
    expect(result.after).toEqual({})
  })

  it('requires all arrival-date parts', async () => {
    const result = await drive(post, {
      payload: validPayload({
        'arrivalDate-day': '',
        'arrivalDate-month': '',
        'arrivalDate-year': ''
      })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors['arrivalDate-day']).toBe(
      copy.errors.arrivalDateRequired
    )
  })

  it('rejects an unreal arrival date and preserves its raw parts', async () => {
    const result = await drive(post, {
      payload: validPayload({
        'arrivalDate-day': '31',
        'arrivalDate-month': '2',
        'arrivalDate-year': '2026'
      })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors['arrivalDate-day']).toBe(
      copy.errors.arrivalDateReal
    )
    expect(result.view.context.values.arrivalDate).toEqual({
      day: '31',
      month: '2',
      year: '2026'
    })
  })

  it.each([
    ['yesterday', -1, 400, copy.errors.arrivalDateWindow],
    ['today', 0, 302, null],
    ['today plus 90 days', 90, 302, null],
    ['today plus 91 days', 91, 400, copy.errors.arrivalDateWindow]
  ])(
    'enforces the inclusive date window at %s',
    async (_name, offset, statusCode, message) => {
      const date = utcDay(offset)
      const result = await drive(post, {
        payload: validPayload({
          'arrivalDate-day': date.day,
          'arrivalDate-month': date.month,
          'arrivalDate-year': date.year
        })
      })

      if (statusCode === 400) {
        expect(result.response.statusCode).toBe(400)
        expect(result.view.context.errors['arrivalDate-day']).toBe(message)
        expect(result.after).toEqual({})
      } else {
        expect(result.response.redirect).toBeTruthy()
        expect(result.after.arrivalDate).toBe(date.iso)
      }
    }
  )

  it.each([
    [
      'empty time',
      { 'arrivalTime-hour': '', 'arrivalTime-minute': '' },
      copy.errors.arrivalTimeRequired
    ],
    [
      'invalid time',
      { 'arrivalTime-hour': '24', 'arrivalTime-minute': '60' },
      copy.errors.arrivalTimeInvalid
    ]
  ])('rejects an %s', async (_name, overrides, message) => {
    const result = await drive(post, {
      payload: validPayload(overrides)
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors['arrivalTime-hour']).toBe(message)
    expect(result.after).toEqual({})
  })
})

describe(`${SUITE} — container rows`, () => {
  setupTransportServer()

  it('requires an explicit usesContainers answer', async () => {
    const result = await drive(post, {
      payload: validPayload({ usesContainers: '' })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.usesContainers).toBe(
      copy.errors.usesContainersRequired
    )
    expect(result.view.context.values.usesContainers).toBeUndefined()
  })

  it.each([
    [
      'empty row',
      { containerNumber: '', sealNumber: '' },
      'containerNumber',
      copy.errors.containerOrSealRequired
    ],
    [
      'long container number',
      { containerNumber: 'C'.repeat(33), sealNumber: '' },
      'containerNumber',
      copy.errors.containerNumberMaxLength
    ],
    [
      'long seal number',
      { containerNumber: '', sealNumber: 'S'.repeat(101) },
      'sealNumber',
      copy.errors.sealNumberMaxLength
    ]
  ])(
    'rejects an %s when adding a container',
    async (_name, row, field, message) => {
      const result = await drive(post, {
        payload: validPayload({
          usesContainers: 'true',
          action: ADD_CONTAINER,
          ...row
        })
      })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[field]).toBe(message)
      expect(result.after).toEqual({})
    }
  )

  it('adds a cleaned container row and re-renders it', async () => {
    const result = await drive(post, {
      payload: validPayload({
        usesContainers: 'true',
        action: ADD_CONTAINER,
        containerNumber: '  CONT-1  ',
        sealNumber: '  SEAL-1  ',
        officialSeal: 'true'
      })
    })

    expect(result.after).toEqual({
      usesContainers: true,
      containers: [container]
    })
    expect(result.view.context.rows).toEqual([
      {
        index: 0,
        containerNumber: 'CONT-1',
        sealNumber: 'SEAL-1',
        officialSeal: 'Yes'
      }
    ])
    expect(result.view.context.entry).toEqual({
      containerNumber: '',
      sealNumber: '',
      officialSeal: false
    })
  })

  it('adds the first container while preserving absent arrival values', async () => {
    const { response, after } = await withSetContext(SET_ID, async () => {
      const journey = await records.create()
      await records.replaceFulfilment(journey.journeyId, {
        [arrivalDate.id]: null,
        [arrivalTime.id]: null
      })
      const addResponse = await post(
        journeyRequest(journey.journeyId, {
          payload: validPayload({
            usesContainers: 'true',
            action: ADD_CONTAINER,
            containerNumber: 'CONT-1',
            sealNumber: 'SEAL-1',
            officialSeal: 'true'
          })
        }),
        stubH()
      )
      const stored = await records.load({ journeyId: journey.journeyId })
      return {
        response: addResponse,
        after: projectAnswers(stored.fulfilment)
      }
    })

    expect(response.statusCode).toBe(200)
    expect(after).toEqual({
      arrivalDate: null,
      arrivalTime: null,
      usesContainers: true,
      containers: [container]
    })
  })

  it('removes exactly the requested committed row', async () => {
    const second = {
      containerNumber: 'CONT-2',
      sealNumber: '',
      officialSeal: false
    }
    const result = await drive(post, {
      seed: { usesContainers: true, containers: [container, second] },
      payload: validPayload({
        usesContainers: 'true',
        action: 'remove-container:0'
      })
    })

    expect(result.after.containers).toEqual([second])
    expect(result.view.context.rows).toHaveLength(1)
    expect(result.view.context.rows[0].containerNumber).toBe('CONT-2')
  })

  it.each([
    'remove-container:99',
    'remove-container:-1',
    'remove-container:1.5'
  ])(
    'refuses forged container action %s without changing persistence',
    async (action) => {
      const seed = { usesContainers: true, containers: [container] }
      const result = await drive(post, {
        seed,
        payload: validPayload({ usesContainers: 'true', action })
      })

      expect(result.response.statusCode).toBe(400)
      expect(result.after).toEqual(seed)
    }
  )

  it('purges committed container rows from persistence when usesContainers becomes No', async () => {
    const result = await drive(post, {
      seed: { usesContainers: true, containers: [container] },
      payload: validPayload({ usesContainers: 'false' })
    })

    expect(result.after.usesContainers).toBe(false)
    expect(result.after).not.toHaveProperty('containers')
    expect(JSON.stringify(result.after)).not.toContain('CONT-1')
  })

  it('purges stale premises when the selected BCP no longer offers it', async () => {
    const result = await drive(post, {
      seed: {
        borderControlPost: 'CONPNT',
        inspectionPremises: 'INSPBAR1'
      },
      payload: validPayload({
        borderControlPost: 'GBLHR4PP',
        inspectionPremises: ''
      })
    })

    expect(result.after.borderControlPost).toBe('GBLHR4PP')
    expect(result.after).not.toHaveProperty('inspectionPremises')
  })
})

describe(`${SUITE} — commit and persistence failures`, () => {
  setupTransportServer()

  it('commits cleaned values including ISO date and HH:mm time', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const date = utcDay(1)
    const result = await drive(post, {
      payload: validPayload({
        borderControlPost: '  CONPNT  ',
        inspectionPremises: '  INSPBAR1  ',
        meansOfTransport: '  AIRPLANE  ',
        transportIdentification: '  BA123  ',
        transportDocumentReference: '  AWB-1  ',
        'arrivalTime-hour': '9',
        'arrivalTime-minute': '5'
      })
    })

    expect(result.after).toEqual({
      borderControlPost: 'CONPNT',
      inspectionPremises: 'INSPBAR1',
      meansOfTransport: 'AIRPLANE',
      transportIdentification: 'BA123',
      transportDocumentReference: 'AWB-1',
      arrivalDate: date.iso,
      arrivalTime: '09:05',
      usesContainers: false
    })
    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('renders the submitted raw values and recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const payload = validPayload({
      transportIdentification: '  RAW ID  '
    })
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.values.transportIdentification).toBe(
      '  RAW ID  '
    )
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
