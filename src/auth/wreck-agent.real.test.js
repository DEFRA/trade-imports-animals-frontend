import { createServer } from 'node:http'
import { Writable } from 'node:stream'
import Wreck from '@hapi/wreck'
import { pino } from 'pino'

import {
  createRetryingKeepAliveAgent,
  useRetryingKeepAliveAgentForWreck
} from './wreck-agent.js'

const RETRY_WARNING = 'Connection did not open, retrying once'

const listen = async (server, port = 0) => {
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
  return server.address().port
}

const close = (server) => new Promise((resolve) => server.close(resolve))

const answeringWithUrl = () =>
  createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ url: request.url }))
  })

const portNobodyListensOn = async () => {
  const server = createServer()
  const port = await listen(server)
  await close(server)
  return port
}

const loggerCalling = (onLine) =>
  pino(
    { level: 'warn' },
    new Writable({
      write(chunk, _encoding, done) {
        onLine(JSON.parse(chunk))
        done()
      }
    })
  )

describe('createRetryingKeepAliveAgent over a real connection', () => {
  test('connects on the second attempt after the first is refused, and logs the retry with the port', async () => {
    const port = await portNobodyListensOn()
    const server = answeringWithUrl()
    const warnings = []
    const agent = createRetryingKeepAliveAgent(
      loggerCalling((line) => {
        warnings.push({ msg: line.msg, port: line.port, code: line.err.code })
        server.listen(port, '127.0.0.1')
      })
    )

    try {
      const { payload } = await Wreck.get(`http://127.0.0.1:${port}/keys`, {
        agent,
        json: true
      })

      expect({ warnings, payload }).toEqual({
        warnings: [{ msg: RETRY_WARNING, port, code: 'ECONNREFUSED' }],
        payload: { url: '/keys' }
      })
    } finally {
      agent.destroy()
      await close(server)
    }
  })

  test('fails with the second refusal when the retry is refused too', async () => {
    const port = await portNobodyListensOn()
    const warnings = []
    const agent = createRetryingKeepAliveAgent(
      loggerCalling((line) => warnings.push(line.msg))
    )

    try {
      const failure = await Wreck.get(`http://127.0.0.1:${port}/keys`, {
        agent
      }).catch((error) => error)

      expect({ code: failure.code, warnings }).toEqual({
        code: 'ECONNREFUSED',
        warnings: [RETRY_WARNING]
      })
    } finally {
      agent.destroy()
    }
  })

  test('sends calls made one after another over one connection', async () => {
    const server = answeringWithUrl()
    let connections = 0
    server.on('connection', () => {
      connections += 1
    })
    const port = await listen(server)
    const agent = createRetryingKeepAliveAgent(loggerCalling(() => {}))

    try {
      await Wreck.post(`http://127.0.0.1:${port}/token`, {
        agent,
        payload: 'grant_type=authorization_code'
      })
      await Wreck.get(`http://127.0.0.1:${port}/keys`, { agent })

      expect(connections).toBe(1)
    } finally {
      agent.destroy()
      await close(server)
    }
  })
})

describe('useRetryingKeepAliveAgentForWreck', () => {
  const originalAgent = Wreck.agents.http

  afterEach(() => {
    Wreck.agents.http.destroy()
    Wreck.agents.http = originalAgent
  })

  test('sends a Wreck call made without an agent over a kept-alive connection', async () => {
    const server = answeringWithUrl()
    let connections = 0
    server.on('connection', () => {
      connections += 1
    })
    const port = await listen(server)
    useRetryingKeepAliveAgentForWreck(loggerCalling(() => {}))

    try {
      await Wreck.get(`http://127.0.0.1:${port}/openid-configuration`)
      await Wreck.get(`http://127.0.0.1:${port}/keys`)

      expect(connections).toBe(1)
    } finally {
      await close(server)
    }
  })
})
