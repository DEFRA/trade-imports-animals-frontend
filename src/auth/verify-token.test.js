import { generateKeyPairSync } from 'node:crypto'
import Jwt from '@hapi/jwt'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { verifyToken } from './verify-token.js'
import { config } from '../config/config.js'
import {
  defraIdDiscoveryCall,
  defraIdDiscoveryDocument,
  useDefraIdNetwork
} from '../server/common/test-helpers/defra-id-network.js'
import { recordEcsLogLines } from '../server/common/test-helpers/ecs-log-lines.js'
import { recordEmfDocuments } from '../server/common/test-helpers/emf-documents.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const rsaKeyPair = () => generateKeyPairSync('rsa', { modulusLength: 2048 })

const signedWith = (privateKey) =>
  Jwt.token.generate(
    {
      sub: 'user-123',
      aud: config.get('defraId.clientId'),
      iss: defraIdDiscoveryDocument.issuer
    },
    {
      key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
      algorithm: 'RS256'
    }
  )

describe('verifyToken', () => {
  const traceId = 'test-trace-id'
  const discoveryCall = { ...defraIdDiscoveryCall, failure: 0 }
  const jwksCall = { dependency: 'defra-id', operation: 'jwks' }
  const defraIdKeys = rsaKeyPair()
  const publishedKeys = {
    keys: [defraIdKeys.publicKey.export({ format: 'jwk' })]
  }

  const { serveDiscovery, interceptJwks } = useDefraIdNetwork()
  const emf = recordEmfDocuments()
  const ecsLog = recordEcsLogLines()
  let tracingHeader

  const jwksLine = () => ecsLog.externalCallLine('defra-id/jwks')

  beforeEach(() => {
    tracingHeader = config.get('tracing.header')
    getTraceIdMock.mockReset()
    getTraceIdMock.mockReturnValue(traceId)
    serveDiscovery()
  })

  test('resolves for a token signed with the key Defra ID publishes, fetched with the trace id, and records a successful defra-id jwks call logged as SYN-12', async () => {
    interceptJwks()
      .matchHeader(tracingHeader, traceId)
      .reply(200, publishedKeys)

    await expect(
      verifyToken(signedWith(defraIdKeys.privateKey))
    ).resolves.toBeUndefined()

    await vi.waitFor(() =>
      expect(emf.externalCalls()).toEqual([
        discoveryCall,
        { ...jwksCall, failure: 0 }
      ])
    )
    expect(jwksLine()['log.level']).toBe('info')
    expect(jwksLine().message).toMatch(
      /^External call defra-id\/jwks \(SYN-12\) success in \d+ ms$/
    )
  })

  test('sends an empty tracing header when the request has no trace id', async () => {
    getTraceIdMock.mockReturnValue(undefined)
    interceptJwks().matchHeader(tracingHeader, '').reply(200, publishedKeys)

    await expect(
      verifyToken(signedWith(defraIdKeys.privateKey))
    ).resolves.toBeUndefined()
  })

  test('rejects a token signed with a key Defra ID does not publish', async () => {
    interceptJwks().reply(200, publishedKeys)

    await expect(
      verifyToken(signedWith(rsaKeyPair().privateKey))
    ).rejects.toThrow('Invalid token signature')
  })

  test('rejects a token when Defra ID publishes no keys', async () => {
    interceptJwks().reply(200, { keys: [] })

    await expect(
      verifyToken(signedWith(defraIdKeys.privateKey))
    ).rejects.toMatchObject({
      code: 'ERR_INVALID_ARG_TYPE',
      message:
        'The "key.key" property must be of type object. Received undefined'
    })
  })

  test('rethrows a key fetch Defra ID answers with 503, and records it as a failed defra-id jwks call logged as SYN-12', async () => {
    interceptJwks().reply(503)

    await expect(
      verifyToken(signedWith(defraIdKeys.privateKey))
    ).rejects.toThrow('Service Unavailable')

    await vi.waitFor(() =>
      expect(emf.externalCalls()).toEqual([
        discoveryCall,
        { ...jwksCall, failure: 1 }
      ])
    )
    expect(jwksLine()['log.level']).toBe('warn')
    expect(jwksLine().http).toEqual({ response: { status_code: 503 } })
    expect(jwksLine().message).toMatch(
      /^External call defra-id\/jwks \(SYN-12\) failure in \d+ ms$/
    )
  })
})
