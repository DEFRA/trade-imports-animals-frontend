import { afterEach, describe, expect, test, vi } from 'vitest'

const { mockRevalidators, mockPartiesByIds } = vi.hoisted(() => ({
  mockRevalidators: [],
  mockPartiesByIds: vi.fn()
}))

vi.mock('./features/index.js', () => ({
  revalidators: mockRevalidators
}))

vi.mock('../../../services/address-book/index.js', () => ({
  partiesByIds: mockPartiesByIds
}))

import {
  buildValidationContext,
  validateAllStored
} from './validate-stored-answers.js'

const ORG = '5900001'

afterEach(() => {
  mockRevalidators.length = 0
  mockPartiesByIds.mockReset()
})

describe('#buildValidationContext', () => {
  test('Should resolve no addresses when the notification has none stored', async () => {
    mockPartiesByIds.mockResolvedValue(new Map())

    const ctx = await buildValidationContext({}, { orgId: ORG })

    expect(mockPartiesByIds).toHaveBeenCalledWith(ORG, [])
    expect(ctx.addressResolutions).toEqual(new Map())
  })

  test('Should collect the contact address id and expose the resolution on ctx', async () => {
    const record = { id: 'record-7', name: 'ACME' }
    mockPartiesByIds.mockResolvedValue(new Map([['record-7', record]]))

    const ctx = await buildValidationContext(
      { contactAddress: { addressId: 'record-7' } },
      { orgId: ORG }
    )

    expect(mockPartiesByIds).toHaveBeenCalledWith(ORG, ['record-7'])
    expect(ctx.addressResolutions.get('record-7')).toBe(record)
  })
})

describe('#validateAllStored', () => {
  test('Should return no errors when no page has a hook', async () => {
    mockPartiesByIds.mockResolvedValue(new Map())

    expect(await validateAllStored({}, { orgId: ORG })).toEqual([])
  })

  test('Should filter out pages whose hook returns no errors', async () => {
    mockPartiesByIds.mockResolvedValue(new Map())
    mockRevalidators.push({ id: 'page-a', run: async () => ({}) })

    expect(await validateAllStored({}, { orgId: ORG })).toEqual([])
  })

  test('Should return each failing page, tagged with its id', async () => {
    mockPartiesByIds.mockResolvedValue(new Map())
    mockRevalidators.push(
      { id: 'page-a', run: async () => ({}) },
      { id: 'page-b', run: async () => ({ field1: 'bad' }) },
      { id: 'page-c', run: async () => ({ field2: 'also bad' }) }
    )

    expect(await validateAllStored({}, { orgId: ORG })).toEqual([
      { id: 'page-b', errors: { field1: 'bad' } },
      { id: 'page-c', errors: { field2: 'also bad' } }
    ])
  })

  test('Should thread answers and the resolved ctx to each hook', async () => {
    const record = { id: 'record-7' }
    mockPartiesByIds.mockResolvedValue(new Map([['record-7', record]]))
    const answers = { contactAddress: { addressId: 'record-7' } }
    const spy = vi.fn(async () => ({}))
    mockRevalidators.push({ id: 'page-a', run: spy })

    await validateAllStored(answers, { orgId: ORG })

    expect(spy).toHaveBeenCalledWith(
      answers,
      expect.objectContaining({
        addressResolutions: expect.any(Map)
      })
    )
  })

  test('Should invoke every page hook in parallel, not sequentially', async () => {
    mockPartiesByIds.mockResolvedValue(new Map())
    const order = []
    mockRevalidators.push(
      {
        id: 'slow',
        run: async () => {
          await new Promise((resolve) => setTimeout(resolve, 20))
          order.push('slow')
          return {}
        }
      },
      {
        id: 'fast',
        run: async () => {
          order.push('fast')
          return {}
        }
      }
    )

    await validateAllStored({}, { orgId: ORG })

    expect(order).toEqual(['fast', 'slow'])
  })
})
