import { afterEach, describe, expect, test, vi } from 'vitest'

const startServerMock = vi.hoisted(() => vi.fn())

vi.mock('./server/common/helpers/start-server.js', () => ({
  startServer: startServerMock
}))

const boot = async () => {
  const listenersBefore = process.listeners('unhandledRejection')
  vi.resetModules()
  await import('./index.js')
  return process
    .listeners('unhandledRejection')
    .find((listener) => !listenersBefore.includes(listener))
}

describe('entry point', () => {
  const originalExitCode = process.exitCode
  let onUnhandledRejection

  afterEach(() => {
    process.off('unhandledRejection', onUnhandledRejection)
    process.exitCode = originalExitCode
    vi.restoreAllMocks()
  })

  test('exits with code 1 when the server fails to start', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {})
    startServerMock.mockRejectedValue(
      new Error('Could not reach the OIDC provider')
    )

    onUnhandledRejection = await boot()

    expect(exit).toHaveBeenCalledWith(1)
  })

  test('marks the process as failed on an unhandled rejection', async () => {
    startServerMock.mockResolvedValue(undefined)

    onUnhandledRejection = await boot()
    onUnhandledRejection(new Error('boom'))

    expect(process.exitCode).toBe(1)
  })
})
