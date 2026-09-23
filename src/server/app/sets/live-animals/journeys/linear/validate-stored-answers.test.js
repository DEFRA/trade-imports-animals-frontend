import { afterEach, describe, expect, test, vi } from 'vitest'

const { mockRevalidators } = vi.hoisted(() => ({ mockRevalidators: [] }))

vi.mock('./features/index.js', () => ({
  revalidators: mockRevalidators
}))

import { validateAllStored } from './validate-stored-answers.js'

afterEach(() => {
  mockRevalidators.length = 0
})

describe('#validateAllStored', () => {
  test('Should return no errors when no page has a hook', async () => {
    expect(await validateAllStored({})).toEqual([])
  })

  test('Should filter out pages whose hook returns no errors', async () => {
    mockRevalidators.push({ id: 'page-a', run: async () => ({}) })

    expect(await validateAllStored({})).toEqual([])
  })

  test('Should return each failing page, tagged with its id', async () => {
    mockRevalidators.push(
      { id: 'page-a', run: async () => ({}) },
      { id: 'page-b', run: async () => ({ field1: 'bad' }) },
      { id: 'page-c', run: async () => ({ field2: 'also bad' }) }
    )

    expect(await validateAllStored({})).toEqual([
      { id: 'page-b', errors: { field1: 'bad' } },
      { id: 'page-c', errors: { field2: 'also bad' } }
    ])
  })

  test('Should pass the stored answers through to each hook', async () => {
    const answers = {
      arrivalDateAtPort: { day: '1', month: '1', year: '2027' }
    }
    const spy = vi.fn(async () => ({}))
    mockRevalidators.push({ id: 'page-a', run: spy })

    await validateAllStored(answers)

    expect(spy).toHaveBeenCalledWith(answers)
  })

  test('Should invoke every page hook in parallel, not sequentially', async () => {
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

    await validateAllStored({})

    expect(order).toEqual(['fast', 'slow'])
  })
})
