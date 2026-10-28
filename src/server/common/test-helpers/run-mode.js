import { afterEach, beforeEach, vi } from 'vitest'

export const switchToStubMode = () => {
  process.env.STUB_MODE = 'true'
}

export const switchToRealMode = () => {
  process.env.STUB_MODE = 'false'
}

export const resetModulesAndRunModeEachTest = () => {
  const originalMode = process.env.STUB_MODE

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.STUB_MODE
    } else {
      process.env.STUB_MODE = originalMode
    }
  })
}
