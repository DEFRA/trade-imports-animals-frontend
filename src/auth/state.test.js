import { describe, test, expect, vi } from 'vitest'
import { createState, validateState } from './state.js'

describe('state helpers', () => {
  test('createState stores and returns a base64-encoded state string', () => {
    const store = {}

    const request = {
      yar: {
        set: vi.fn((key, value) => {
          store[key] = value
        }),
        get: vi.fn((key) => store[key]),
        clear: vi.fn((key) => {
          delete store[key]
        })
      }
    }

    const state = createState(request)

    expect(state).toBe(store.state)
    expect(typeof state).toBe('string')
    expect(state.length).toBeGreaterThan(0)

    // Decode and verify shape
    const decodedJson = Buffer.from(state, 'base64').toString('utf8')
    const decoded = JSON.parse(decodedJson)

    expect(decoded).toHaveProperty('id')
    expect(typeof decoded.id).toBe('string')

    expect(request.yar.set).toHaveBeenCalledWith('state', state)
  })

  test('validateState clears stored state and does not throw when state matches', () => {
    const storedState = 'stored-state'
    const request = {
      yar: {
        get: vi.fn(() => storedState),
        clear: vi.fn()
      }
    }

    expect(() => validateState(request, storedState)).not.toThrow()

    expect(request.yar.get).toHaveBeenCalledWith('state')
    expect(request.yar.clear).toHaveBeenCalledWith('state')
  })

  test('validateState throws and clears stored state when state mismatches', () => {
    const storedState = 'stored-state'
    const providedState = 'different-state'

    const request = {
      yar: {
        get: vi.fn(() => storedState),
        clear: vi.fn()
      }
    }

    expect(() => validateState(request, providedState)).toThrow(
      'Invalid state, possible CSRF attack'
    )

    expect(request.yar.get).toHaveBeenCalledWith('state')
    expect(request.yar.clear).toHaveBeenCalledWith('state')
  })
})
