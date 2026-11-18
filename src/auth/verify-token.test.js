import { describe, test, expect, vi, beforeEach } from 'vitest'
import { verifyToken } from './verify-token.js'
import { config } from '../config/config.js'
import { recordEmfDocuments } from '../server/common/test-helpers/emf-documents.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'

const wreckGetMock = vi.hoisted(() => vi.fn())
const getOidcConfigMock = vi.hoisted(() => vi.fn())
const createPublicKeyMock = vi.hoisted(() => vi.fn())
const jwtDecodeMock = vi.hoisted(() => vi.fn())
const jwtVerifyMock = vi.hoisted(() => vi.fn())
const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@hapi/wreck', () => ({
  default: { get: wreckGetMock }
}))

vi.mock('./get-oidc-config.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getOidcConfig: getOidcConfigMock
}))

vi.mock('node:crypto', () => ({
  createPublicKey: createPublicKeyMock
}))

vi.mock('@hapi/jwt', () => ({
  default: {
    token: {
      decode: jwtDecodeMock,
      verify: jwtVerifyMock
    }
  }
}))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

vi.mock('../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  })
}))

describe('verifyToken', () => {
  const traceId = 'test-trace-id'
  const jwksCall = { dependency: 'defra-id', operation: 'jwks' }

  const emf = recordEmfDocuments()
  restoreConfigAfterEach(['defraId.clientId'])
  let tracingHeader

  beforeEach(() => {
    config.set('defraId.clientId', 'test-client-id')
    tracingHeader = config.get('tracing.header')
    getTraceIdMock.mockReturnValue(traceId)
  })

  test('measures the key fetch as defra-id jwks', async () => {
    getOidcConfigMock.mockResolvedValue({ jwks_uri: 'https://mock/jwks' })
    wreckGetMock.mockResolvedValue({ payload: { keys: [{}] } })
    createPublicKeyMock.mockReturnValue({
      export: vi.fn().mockReturnValue('pem')
    })
    jwtDecodeMock.mockReturnValue({})

    await verifyToken('jwt-token')

    expect(await emf.onlyExternalCall()).toEqual({ ...jwksCall, failure: 0 })
  })

  test('verifies token using first JWK', async () => {
    const token = 'jwt-token'
    const jwksUri = 'https://mock-auth-server/.well-known/jwks'

    const jwk = { kty: 'RSA', n: 'abc', e: 'AQAB' }
    const keys = [jwk]

    const pem = '-----BEGIN PUBLIC KEY-----...'
    const decoded = { header: {}, payload: { sub: '123' } }

    getOidcConfigMock.mockResolvedValue({
      jwks_uri: jwksUri,
      issuer: 'https://mock-auth-server'
    })
    wreckGetMock.mockResolvedValue({ payload: { keys } })
    createPublicKeyMock.mockReturnValue({
      export: vi.fn().mockReturnValue(pem)
    })
    jwtDecodeMock.mockReturnValue(decoded)
    jwtVerifyMock.mockReturnValue(true)

    await expect(verifyToken(token)).resolves.toBeUndefined()

    expect(getOidcConfigMock).toHaveBeenCalledTimes(1)
    expect(wreckGetMock).toHaveBeenCalledWith(jwksUri, {
      headers: { [tracingHeader]: traceId },
      json: true,
      timeout: 1000
    })
    expect(createPublicKeyMock).toHaveBeenCalledWith({
      key: jwk,
      format: 'jwk'
    })
    expect(jwtDecodeMock).toHaveBeenCalledWith(token)
    expect(jwtVerifyMock).toHaveBeenCalledWith(decoded, {
      key: pem,
      algorithm: 'RS256',
      aud: 'test-client-id',
      iss: 'https://mock-auth-server'
    })
  })

  test('sends an empty tracing header when the request has no trace id', async () => {
    const jwksUri = 'https://mock-auth-server/.well-known/jwks'
    getTraceIdMock.mockReturnValue(undefined)
    getOidcConfigMock.mockResolvedValue({ jwks_uri: jwksUri })
    wreckGetMock.mockResolvedValue({ payload: { keys: [{}] } })
    createPublicKeyMock.mockReturnValue({
      export: vi.fn().mockReturnValue('pem')
    })
    jwtDecodeMock.mockReturnValue({})

    await verifyToken('jwt-token')

    expect(wreckGetMock).toHaveBeenCalledWith(
      jwksUri,
      expect.objectContaining({ headers: { [tracingHeader]: '' } })
    )
  })

  test('propagates errors from Wreck.get', async () => {
    getOidcConfigMock.mockResolvedValue({
      jwks_uri: 'https://mock-auth-server/jwks'
    })
    wreckGetMock.mockRejectedValue(new Error('jwks fetch failed'))

    await expect(verifyToken('token')).rejects.toThrow('jwks fetch failed')

    expect(await emf.onlyExternalCall()).toEqual({ ...jwksCall, failure: 1 })
  })

  test('throws if JWKS has no keys', async () => {
    getOidcConfigMock.mockResolvedValue({
      jwks_uri: 'https://mock-auth-server/jwks'
    })
    wreckGetMock.mockResolvedValue({ payload: { keys: [] } })

    createPublicKeyMock.mockImplementation(() => {
      throw new Error('no jwk available')
    })

    await expect(verifyToken('token')).rejects.toThrow('no jwk available')
  })
})
