import { Agent } from 'node:http'
import { connect } from 'node:net'
import Wreck from '@hapi/wreck'

const connectWithOneRetry = (options, logger, oncreate) => {
  const neverOpenedCodes = new Set(['ETIMEDOUT', 'ECONNREFUSED'])
  const attempt = (retrying) => {
    const socket = connect(options)
    const onConnect = () => {
      socket.off('error', onError)
      oncreate(null, socket)
    }
    const onError = (error) => {
      socket.off('connect', onConnect)
      if (retrying || !neverOpenedCodes.has(error.code)) {
        oncreate(error)
        return
      }
      logger.warn(
        { err: error, host: options.host, port: options.port },
        'Connection did not open, retrying once'
      )
      attempt(true)
    }
    socket.once('connect', onConnect)
    socket.once('error', onError)
  }
  attempt(false)
}

class RetryingKeepAliveAgent extends Agent {
  constructor(logger) {
    super({ keepAlive: true })
    this.logger = logger
  }

  createConnection(options, oncreate) {
    connectWithOneRetry(options, this.logger, oncreate)
  }
}

/**
 * An HTTP agent that keeps connections open for the next call, and tries a
 * connection that timed out or was refused before it opened once more, logging
 * the retry at warn. Nothing is written to a connection before it opens.
 *
 * @param {import('pino').Logger} logger - where the retry warning is written
 * @returns {import('node:http').Agent} the agent
 */
export const createRetryingKeepAliveAgent = (logger) =>
  new RetryingKeepAliveAgent(logger)

/**
 * Sends every plain-HTTP Wreck call in the process, Bell's included, through a
 * retrying keep-alive agent.
 *
 * @param {import('pino').Logger} logger - where the retry warning is written
 */
export const useRetryingKeepAliveAgentForWreck = (logger) => {
  Wreck.agents.http = createRetryingKeepAliveAgent(logger)
}
