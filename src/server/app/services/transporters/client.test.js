import { describe, expect, test } from 'vitest'

import {
  addressBookAnswering,
  addressBookRefusingAddresses,
  fetchMock,
  resetMocksAndConfigAfterTests
} from '../../engine/test-support.js'
import { createTransporter, listTransporters } from './client.js'
import { WIRE_PRIVATE } from './wire-types.js'

const ORGANISATION_ID = 'org-42'
const ORGANISATION_ID_HEADER = 'trade-imports-organisation-id'
const TRANSPORTER_NAME = 'Aberdeen Livestock Ltd'

const WIRE_TRANSPORTER = {
  id: '665f1c2ab3e4d51a2c9d0e77',
  name: TRANSPORTER_NAME,
  type: WIRE_PRIVATE,
  countryCode: 'GB'
}

const transporterRequests = () =>
  fetchMock.requests().filter(({ url }) => url.includes('/transporters'))

const refusalFrom = async (call) => {
  try {
    await call()
  } catch (error) {
    return error
  }
  return null
}

describe('#listTransporters', () => {
  resetMocksAndConfigAfterTests()

  test('Should GET the organisation’s transporters with the organisation header, a page big enough for the list', async () => {
    addressBookAnswering({
      body: JSON.stringify({ items: [WIRE_TRANSPORTER] })
    })

    await listTransporters(ORGANISATION_ID)

    const [request] = transporterRequests()
    expect({
      method: request.method,
      path: new URL(request.url).pathname,
      pageSize: new URL(request.url).searchParams.get('pageSize'),
      organisation: request.headers.get(ORGANISATION_ID_HEADER)
    }).toEqual({
      method: 'GET',
      path: `/organisation/${ORGANISATION_ID}/transporters`,
      pageSize: '100',
      organisation: ORGANISATION_ID
    })
  })

  test('Should answer with the items the address book listed', async () => {
    addressBookAnswering({
      body: JSON.stringify({ items: [WIRE_TRANSPORTER] })
    })

    expect(await listTransporters(ORGANISATION_ID)).toEqual([WIRE_TRANSPORTER])
  })

  test('Should refuse an organisation id the session does not carry, before any request', async () => {
    addressBookAnswering({ body: JSON.stringify({ items: [] }) })

    const refusal = await refusalFrom(() => listTransporters(''))

    expect(refusal.message).toContain('without an organisation')
    expect(transporterRequests()).toEqual([])
  })

  test('Should page through every page the address book reports, concatenating the items', async () => {
    const pageOfItems = (pageNumber, count) =>
      Array.from({ length: count }, (_, index) => ({
        ...WIRE_TRANSPORTER,
        id: `page${pageNumber}-${index}`
      }))
    const pages = {
      1: pageOfItems(1, 100),
      2: pageOfItems(2, 50)
    }
    addressBookAnswering((request) => {
      const page = new URL(request.url).searchParams.get('page')
      return {
        body: JSON.stringify({
          items: pages[page],
          page: Number(page),
          pageSize: 100,
          totalItems: 150,
          totalPages: 2
        })
      }
    })

    const result = await listTransporters(ORGANISATION_ID)

    expect(result).toHaveLength(150)
    expect(
      transporterRequests().map((request) =>
        new URL(request.url).searchParams.get('page')
      )
    ).toEqual(['1', '2'])
  })

  test('Should refuse a list the address book would not give, naming the operation', async () => {
    addressBookRefusingAddresses()

    const refusal = await refusalFrom(() => listTransporters(ORGANISATION_ID))

    expect(refusal.message).toContain('Failed to list transporters')
    expect(refusal.status).toBe(500)
  })
})

describe('#createTransporter', () => {
  resetMocksAndConfigAfterTests()

  test('Should POST the transporter to the organisation’s own path, with the organisation header', async () => {
    addressBookAnswering({ body: JSON.stringify(WIRE_TRANSPORTER) })

    await createTransporter(ORGANISATION_ID, { name: TRANSPORTER_NAME })

    const [request] = transporterRequests()
    expect({
      method: request.method,
      path: new URL(request.url).pathname,
      organisation: request.headers.get(ORGANISATION_ID_HEADER),
      body: await request.json()
    }).toEqual({
      method: 'POST',
      path: `/organisation/${ORGANISATION_ID}/transporters`,
      organisation: ORGANISATION_ID,
      body: { name: TRANSPORTER_NAME }
    })
  })

  test('Should answer with the record the address book stored', async () => {
    addressBookAnswering({ body: JSON.stringify(WIRE_TRANSPORTER) })

    expect(
      await createTransporter(ORGANISATION_ID, {
        name: TRANSPORTER_NAME
      })
    ).toEqual(WIRE_TRANSPORTER)
  })

  test('Should refuse a save the address book would not take, naming the operation', async () => {
    addressBookRefusingAddresses()

    const refusal = await refusalFrom(() =>
      createTransporter(ORGANISATION_ID, { name: TRANSPORTER_NAME })
    )

    expect(refusal.message).toContain('Failed to create transporter')
    expect(refusal.status).toBe(500)
  })
})
