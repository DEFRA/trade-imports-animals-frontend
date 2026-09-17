import { beforeEach, describe, expect, test, vi } from 'vitest'
import { isStubMode } from './mode.js'

const configGetMock = vi.hoisted(() => vi.fn())

vi.mock('../../../config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

const withConfig = ({ stubMode, isProduction }) => {
  configGetMock.mockImplementation((key) =>
    key === 'stubMode' ? stubMode : isProduction
  )
}

describe('#isStubMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Should be on when the flag is set outside production', () => {
    withConfig({ stubMode: true, isProduction: false })

    expect(isStubMode()).toBe(true)
  })

  test('Should be off in production even when the flag is set', () => {
    // The reason this helper exists rather than reading the flag directly.
    // Stub mode hands a session to any unauthenticated caller with no identity
    // provider involved, so honouring the flag in production would mean anyone
    // able to set an environment variable could sign in as the stub user. It
    // would also serve stub data in place of the real address book and backend.
    withConfig({ stubMode: true, isProduction: true })

    expect(isStubMode()).toBe(false)
  })

  test('Should be off when the flag is not set', () => {
    withConfig({ stubMode: false, isProduction: false })

    expect(isStubMode()).toBe(false)
  })

  test('Should be off in production when the flag is not set', () => {
    withConfig({ stubMode: false, isProduction: true })

    expect(isStubMode()).toBe(false)
  })
})
