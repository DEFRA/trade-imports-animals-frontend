import { setTimeout } from 'node:timers/promises'

/**
 * Builds a nock reply that sends nothing, headers included, until a delay has passed.
 *
 * @param {number} delayMs - How long to hold back the whole response
 * @param {number} statusCode - The status to reply with
 * @param {string | object} body - The body to reply with
 * @returns {() => Promise<[number, string | object]>} A function to pass to a scope's `reply`
 */
export const replyAfter = (delayMs, statusCode, body) => () =>
  setTimeout(delayMs, [statusCode, body])
