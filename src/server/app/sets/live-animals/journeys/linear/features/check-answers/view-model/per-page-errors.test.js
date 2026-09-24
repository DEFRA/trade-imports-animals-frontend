import { afterEach, describe, expect, test, vi } from 'vitest'

const { mockRevalidators } = vi.hoisted(() => ({ mockRevalidators: [] }))

vi.mock('../../../revalidators.js', () => ({
  revalidators: mockRevalidators
}))

import { applyPerPageErrors } from './per-page-errors.js'

const PORT_OF_ENTRY = 'port-of-entry'
const ADDRESSES = 'addresses'
const ARRIVAL_DETAILS = 'arrivalDetails'

afterEach(() => {
  mockRevalidators.length = 0
})

describe('#applyPerPageErrors', () => {
  test('Should return empty maps when no page has failed', () => {
    expect(applyPerPageErrors([])).toEqual({
      cardErrors: {},
      partyErrors: {}
    })
  })

  test('Should roll a card-surfaced revalidator up to one card message', () => {
    mockRevalidators.push({
      id: PORT_OF_ENTRY,
      run: async () => ({}),
      surface: { kind: 'card', cardId: ARRIVAL_DETAILS }
    })

    const result = applyPerPageErrors([
      { id: PORT_OF_ENTRY, errors: { arrivalDateAtPort: 'x' } }
    ])

    expect(result.cardErrors).toHaveProperty('arrivalDetails')
    expect(result.partyErrors).toEqual({})
  })

  test('Should keep party-surfaced revalidator errors keyed by role', () => {
    mockRevalidators.push({
      id: ADDRESSES,
      run: async () => ({}),
      surface: { kind: 'party' }
    })

    const result = applyPerPageErrors([
      {
        id: ADDRESSES,
        errors: {
          consignor: 'Select an address for the consignor',
          importer: 'Select an address for the importer'
        }
      }
    ])

    expect(result.cardErrors).toEqual({})
    expect(result.partyErrors).toEqual({
      consignor: 'Select an address for the consignor',
      importer: 'Select an address for the importer'
    })
  })

  test('Should carry both surfaces at once when a mix of pages fail', () => {
    mockRevalidators.push(
      {
        id: PORT_OF_ENTRY,
        run: async () => ({}),
        surface: { kind: 'card', cardId: ARRIVAL_DETAILS }
      },
      {
        id: ADDRESSES,
        run: async () => ({}),
        surface: { kind: 'party' }
      }
    )

    const result = applyPerPageErrors([
      { id: PORT_OF_ENTRY, errors: { arrivalDateAtPort: 'x' } },
      { id: ADDRESSES, errors: { consignor: 'y' } }
    ])

    expect(result.cardErrors).toHaveProperty('arrivalDetails')
    expect(result.partyErrors).toHaveProperty('consignor')
  })

  test('Should drop a page whose hook returned an empty errors object', () => {
    mockRevalidators.push({
      id: PORT_OF_ENTRY,
      run: async () => ({}),
      surface: { kind: 'card', cardId: ARRIVAL_DETAILS }
    })

    const result = applyPerPageErrors([{ id: PORT_OF_ENTRY, errors: {} }])

    expect(result.cardErrors).toEqual({})
    expect(result.partyErrors).toEqual({})
  })
})
