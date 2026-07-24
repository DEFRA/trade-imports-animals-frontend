import { vi } from 'vitest'

import { catchAll } from './errors.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../constants/status-codes.js'

import { mockOidcConfig } from '../test-helpers/mock-oidc-config.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#errors', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    server.route({
      method: 'GET',
      path: '/test/programming-error',
      options: { auth: false },
      handler: () => {
        throw new TypeError('programming failure')
      }
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected Not Found page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/non-existent-path'
    })

    expect(result).toEqual(
      expect.stringContaining(
        'Page not found | Import notification service (standalone)'
      )
    )
    expect(result).toEqual(
      expect.stringContaining('Obligations v2 spike standalone')
    )
    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('Should render an unexpected programming error in promoted chrome without the recoverable banner', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/test/programming-error'
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toEqual(
      expect.stringContaining(
        'Something went wrong | Import notification service (standalone)'
      )
    )
    expect(result).toEqual(expect.stringContaining('>500</h1>'))
    expect(result).not.toEqual(
      expect.stringContaining(
        'Your answers on this page have been saved. Try again in a few minutes.'
      )
    )
  })
})

describe('#catchAll', () => {
  const mockErrorLogger = vi.fn()
  const mockStack = 'Mock error stack'
  const errorPage = 'live-animals/shared/error'
  const mockRequest = (statusCode) => ({
    response: {
      isBoom: true,
      stack: mockStack,
      output: {
        statusCode
      }
    },
    logger: { error: mockErrorLogger }
  })
  const mockToolkitView = vi.fn()
  const mockToolkitCode = vi.fn()
  const mockToolkit = {
    view: mockToolkitView.mockReturnThis(),
    code: mockToolkitCode.mockReturnThis(),
    continue: Symbol('continue')
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const expectedContext = (pageTitle, heading) =>
    expect.objectContaining({
      pageTitle,
      heading,
      message: pageTitle,
      breadcrumbs: false,
      journeyStrip: null,
      recoverableError: false
    })

  test('Should provide expected "Not Found" page', () => {
    catchAll(mockRequest(statusCodes.notFound), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext('Page not found', statusCodes.notFound)
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.notFound)
  })

  test('Should provide expected "Forbidden" page', () => {
    catchAll(mockRequest(statusCodes.forbidden), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext('Forbidden', statusCodes.forbidden)
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.forbidden)
  })

  test('Should provide expected "Unauthorized" page', () => {
    catchAll(mockRequest(statusCodes.unauthorized), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext('Unauthorized', statusCodes.unauthorized)
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.unauthorized)
  })

  test('Should provide expected "Bad Request" page', () => {
    catchAll(mockRequest(statusCodes.badRequest), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext('Bad Request', statusCodes.badRequest)
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.badRequest)
  })

  test('Should provide expected default page', () => {
    catchAll(mockRequest(statusCodes.imATeapot), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext('Something went wrong', statusCodes.imATeapot)
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.imATeapot)
  })

  test('Should provide expected "Something went wrong" page and log error for internalServerError', () => {
    catchAll(mockRequest(statusCodes.internalServerError), mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(
      errorPage,
      expectedContext('Something went wrong', statusCodes.internalServerError)
    )
    expect(mockToolkitCode).toHaveBeenCalledWith(
      statusCodes.internalServerError
    )
  })

  test('Should leave non-Boom responses untouched', () => {
    const result = catchAll(
      { response: { statusCode: 302 }, logger: { error: mockErrorLogger } },
      mockToolkit
    )

    expect(result).toBe(mockToolkit.continue)
    expect(mockToolkitView).not.toHaveBeenCalled()
    expect(mockToolkitCode).not.toHaveBeenCalled()
  })
})
