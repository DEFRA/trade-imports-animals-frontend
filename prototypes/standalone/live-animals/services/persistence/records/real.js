import { getTraceId } from '@defra/hapi-tracing'
import { createLogger } from '../../../../../../src/server/common/helpers/logging/logger.js'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from './fulfilment-codec.js'
import {
  answersToTargetNotification,
  fulfilmentToNotification
} from './mapper.js'

const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'
const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'

const fulfilmentsUrl = `${backendBaseUrl}/fulfilments`
const notificationsUrl = `${backendBaseUrl}/notifications`
const proposedNotificationsUrl = `${backendBaseUrl}/proposed-notifications`

const BACKEND_SUBMITTED = 'SUBMITTED'
const HTTP_NOT_FOUND = 404
const MAX_PROJECTION_ATTEMPTS = 2

const logger = createLogger()

const headers = () => ({
  'Content-Type': 'application/json',
  [tracingHeader]: getTraceId() ?? ''
})

const failed = (action, response) => {
  const error = new Error(
    `Failed to ${action}: ${response.status} ${response.statusText}`
  )
  error.status = response.status
  error.statusText = response.statusText
  return error
}

const mapStatus = (backendStatus) =>
  backendStatus === BACKEND_SUBMITTED ? SUBMITTED : IN_PROGRESS

const marshal = (document, userId = null) => {
  const status = mapStatus(document.status)
  return {
    journeyId: document.id,
    userId,
    status,
    createdAt: document.createdAt ?? null,
    submittedAt: status === SUBMITTED ? (document.submittedAt ?? null) : null,
    fulfilment: decodePersistedFulfilment(document.fulfilment)
  }
}

const resolveStatus = async (journeyId, known) => {
  if (known != null && known.journeyId === journeyId) return known.status
  const existing = await getFulfilment(journeyId)
  if (existing === undefined) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  return mapStatus(existing.status)
}

const assertWritable = (journeyId, status) => {
  if (status === SUBMITTED) {
    throw new Error(`Journey "${journeyId}" is submitted — writes blocked`)
  }
}

const getFulfilment = async (journeyId) => {
  const response = await fetch(`${fulfilmentsUrl}/${journeyId}`, {
    method: 'GET',
    headers: headers()
  })
  if (response.status === HTTP_NOT_FOUND) return undefined
  if (!response.ok) throw failed('get fulfilment', response)
  return response.json()
}

const put = async (url, body, action) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body)
  })
  if (!response.ok) throw failed(action, response)
  return response
}

const putProjection = async ({ journeyId, name, url, body }) => {
  let lastError
  for (let attempt = 1; attempt <= MAX_PROJECTION_ATTEMPTS; attempt++) {
    try {
      await put(url, body, `save ${name} projection`)
      return
    } catch (error) {
      lastError = error
      if (attempt < MAX_PROJECTION_ATTEMPTS) {
        logger.warn(
          { err: error, journeyId, projection: name, attempt },
          'Projection save failed; retrying idempotent PUT'
        )
      }
    }
  }
  throw lastError
}

const throwProjectionFailure = (journeyId, failures) => {
  const failedProjections = failures.map(({ name }) => name)
  const error = new AggregateError(
    failures.map(({ error: cause }) => cause),
    `Canonical fulfilment "${journeyId}" saved, but projection writes failed: ${failedProjections.join(', ')}`
  )
  error.canonicalSaved = true
  error.journeyId = journeyId
  error.failedProjections = failedProjections
  logger.error(
    { err: error, journeyId, failedProjections },
    'Canonical fulfilment saved with projection failures'
  )
  throw error
}

export const records = {
  async create({ userId } = {}) {
    const response = await fetch(fulfilmentsUrl, {
      method: 'POST',
      headers: headers()
    })
    if (!response.ok) throw failed('create fulfilment', response)
    return marshal(await response.json(), userId ?? null)
  },

  async load({ journeyId, userId } = {}) {
    if (journeyId != null) {
      const fulfilment = await getFulfilment(journeyId)
      return fulfilment === undefined
        ? undefined
        : marshal(fulfilment, userId ?? null)
    }
    return undefined
  },

  async list({ journeyIds = [] } = {}) {
    const fulfilments = await Promise.all(journeyIds.map(getFulfilment))
    return fulfilments
      .filter((fulfilment) => fulfilment !== undefined)
      .map((fulfilment) => marshal(fulfilment))
  },

  async has(journeyId) {
    return (await getFulfilment(journeyId)) !== undefined
  },

  async replaceFulfilment(journeyId, fulfilment, { known } = {}) {
    const status = await resolveStatus(journeyId, known)
    assertWritable(journeyId, status)

    const snapshot = structuredClone(fulfilment ?? {})
    const canonicalDocument = {
      id: journeyId,
      fulfilment: encodeEvaluatorFulfilments(snapshot)
    }
    const projections = [
      {
        name: 'current notification',
        url: `${notificationsUrl}/${journeyId}`,
        body: fulfilmentToNotification(snapshot, journeyId)
      },
      {
        name: 'proposed notification',
        url: `${proposedNotificationsUrl}/${journeyId}`,
        body: answersToTargetNotification(snapshot, journeyId)
      }
    ]

    const canonicalResponse = await put(
      `${fulfilmentsUrl}/${journeyId}`,
      canonicalDocument,
      'save fulfilment'
    )
    const saved = await canonicalResponse.json()

    const failures = []
    for (const projection of projections) {
      try {
        await putProjection({ journeyId, ...projection })
      } catch (error) {
        failures.push({ name: projection.name, error })
      }
    }
    if (failures.length > 0) {
      throwProjectionFailure(journeyId, failures)
    }

    return marshal(saved)
  },

  async finalise(journeyId) {
    const response = await fetch(`${fulfilmentsUrl}/${journeyId}/submit`, {
      method: 'POST',
      headers: headers()
    })
    if (!response.ok) throw failed('submit fulfilment', response)
    return marshal(await response.json())
  },

  async amend(journeyId) {
    const response = await fetch(`${fulfilmentsUrl}/${journeyId}/amend`, {
      method: 'POST',
      headers: headers()
    })
    if (!response.ok) throw failed('amend fulfilment', response)
    return marshal(await response.json())
  },

  async clear() {}
}
