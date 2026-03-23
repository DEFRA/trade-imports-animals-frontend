import { describe, test, expect } from 'vitest'
import { getPermissions } from './get-permissions.js'

describe('getPermissions', () => {
  test('returns expected role and scope for mocked data', async () => {
    const result = await getPermissions('CRN_123', 'ORG_456', 'access-token')

    expect(result).toEqual({
      role: 'Farmer',
      scope: ['user', 'Full permission - business']
    })
  })

  test('returns consistent shape (role + scope) regardless of inputs', async () => {
    const result = await getPermissions('some-other-crn', 'some-org', 'tkn')

    expect(result).toHaveProperty('role')
    expect(result).toHaveProperty('scope')
    expect(typeof result.role).toBe('string')
    expect(Array.isArray(result.scope)).toBe(true)

    // default scope should always be first per implementation
    expect(result.scope[0]).toBe('user')
  })
})
