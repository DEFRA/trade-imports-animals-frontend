import { describe, test, expect, vi } from 'vitest'

const wreckGetMock = vi.hoisted(() => vi.fn())
const getOidcConfigMock = vi.hoisted(() => vi.fn())
const jwkToPemMock = vi.hoisted(() => vi.fn())
const jwtDecodeMock = vi.hoisted(() => vi.fn())
const jwtVerifyMock = vi.hoisted(() => vi.fn())

vi.mock('@hapi/wreck', () => ({
  default: { get: wreckGetMock }
}))

vi.mock('./get-oidc-config.js', () => ({
  getOidcConfig: getOidcConfigMock
}))

vi.mock('jwk-to-pem', () => ({
  default: jwkToPemMock
}))

vi.mock('@hapi/jwt', () => ({
  default: {
    token: {
      decode: jwtDecodeMock,
      verify: jwtVerifyMock
    }
  }
}))

import { verifyToken } from './verify-token.js'

describe('verifyToken', () => {
  test('verifies token using first JWK', async () => {
    const token = 'jwt-token'
    const jwksUri = 'https://mock-auth-server/.well-known/jwks'

    const jwk = { kty: 'RSA', n: 'abc', e: 'AQAB' }
    const keys = [jwk]

    const pem = '-----BEGIN PUBLIC KEY-----...'
    const decoded = { header: {}, payload: { sub: '123' } }

    getOidcConfigMock.mockResolvedValue({ jwks_uri: jwksUri })
    wreckGetMock.mockResolvedValue({ payload: { keys } })
    jwkToPemMock.mockReturnValue(pem)
    jwtDecodeMock.mockReturnValue(decoded)
    jwtVerifyMock.mockReturnValue(true)

    await expect(verifyToken(token)).resolves.toBeUndefined()

    expect(getOidcConfigMock).toHaveBeenCalledTimes(1)
    expect(wreckGetMock).toHaveBeenCalledWith(jwksUri, { json: true })
    expect(jwkToPemMock).toHaveBeenCalledWith(jwk)
    expect(jwtDecodeMock).toHaveBeenCalledWith(token)
    expect(jwtVerifyMock).toHaveBeenCalledWith(decoded, {
      key: pem,
      algorithm: 'RS256'
    })
  })

  test('propagates errors from Wreck.get', async () => {
    getOidcConfigMock.mockResolvedValue({
      jwks_uri: 'https://mock-auth-server/jwks'
    })
    wreckGetMock.mockRejectedValue(new Error('jwks fetch failed'))

    await expect(verifyToken('token')).rejects.toThrow('jwks fetch failed')
  })

  test('throws if JWKS has no keys', async () => {
    getOidcConfigMock.mockResolvedValue({
      jwks_uri: 'https://mock-auth-server/jwks'
    })
    wreckGetMock.mockResolvedValue({ payload: { keys: [] } })

    jwkToPemMock.mockImplementation(() => {
      throw new Error('no jwk available')
    })

    await expect(verifyToken('token')).rejects.toThrow('no jwk available')
  })
})
