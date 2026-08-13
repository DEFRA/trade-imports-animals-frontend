import { beforeEach, describe, expect, test, vi } from 'vitest'
import { isAuthStubMode } from './mode.js'

const configGetMock = vi.hoisted(() => vi.fn())

vi.mock('../../../config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

const withConfig = ({ stubMode, isProduction }) => {
  configGetMock.mockImplementation((key) =>
    key === 'auth.stubMode' ? stubMode : isProduction
  )
}

describe('#isAuthStubMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should be on when the flag is set outside production', () => {
    withConfig({ stubMode: true, isProduction: false })

    expect(isAuthStubMode()).toBe(true)
  })

  test('Should be off in production even when the flag is set', () => {
    // The reason this helper exists rather than reading the flag directly.
    // Stub mode signs its own sessions with a key committed to this repo, so
    // honouring the flag in production would mean anyone able to set an
    // environment variable could mint an authenticated session.
    withConfig({ stubMode: true, isProduction: true })

    expect(isAuthStubMode()).toBe(false)
  })

  test('Should be off when the flag is not set', () => {
    withConfig({ stubMode: false, isProduction: false })

    expect(isAuthStubMode()).toBe(false)
  })

  test('Should be off in production when the flag is not set', () => {
    withConfig({ stubMode: false, isProduction: true })

    expect(isAuthStubMode()).toBe(false)
  })
})
