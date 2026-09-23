import { afterEach, describe, expect, test } from 'vitest'

import { config } from './config.js'

describe('config URL validation', () => {
  const originalAddressBookUrl = config.get(
    'tradeImportsAddressBookApi.baseUrl'
  )
  const originalInsFrontendUrl = config.get('tradeImportsInsFrontend.baseUrl')

  afterEach(() => {
    config.set('tradeImportsAddressBookApi.baseUrl', originalAddressBookUrl)
    config.set('tradeImportsInsFrontend.baseUrl', originalInsFrontendUrl)
  })

  test('rejects a malformed tradeImportsAddressBookApi.baseUrl', () => {
    config.set('tradeImportsAddressBookApi.baseUrl', 'not a valid url')

    expect(() => config.validate({ allowed: 'strict' })).toThrow()
  })

  test('rejects a malformed tradeImportsInsFrontend.baseUrl', () => {
    config.set('tradeImportsInsFrontend.baseUrl', 'not a valid url')

    expect(() => config.validate({ allowed: 'strict' })).toThrow()
  })
})
