import { getTraceId } from '@defra/hapi-tracing'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED
} from '../../../engine/persistence/records.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from './fulfilment-codec/index.js'
import { BackendRequestError, markRecoverableBackendError } from './errors.js'
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

const HTTP_NOT_FOUND = 404
const MAX_PROJECTION_ATTEMPTS = 2

const logger = createLogger()

const headers = (owner) => ({
  'Content-Type': 'application/json',
  [tracingHeader]: getTraceId() ?? '',
  'X-Owner-Id': owner?.sub ?? '',
  'X-Owner-Organisation': owner?.organisation ?? ''
})

const failed = (action, response) => new BackendRequestError(action, response)

const STATUS_BY_BACKEND_STATUS = Object.freeze({
  DRAFT,
  SUBMITTED,
  AMEND,
  DELETED
})

export const mapStatus = (backendStatus) => {
  const status = STATUS_BY_BACKEND_STATUS[backendStatus]
  if (status === undefined) {
    throw new Error(`Unknown backend fulfilment status "${backendStatus}"`)
  }
  return status
}

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

const marshalListItem = (item) => ({
  journeyId: item.id,
  status: mapStatus(item.status),
  createdAt: item.createdAt ?? null,
  submittedAt: item.submittedAt ?? null,
  reference: item.reference,
  commodity: item.commodityDisplay,
  originCountryCode: item.originCountryCode,
  arrivalDate: item.arrivalDate,
  consignorName: item.consignorName,
  consigneeName: item.consigneeName
})

const resolveStatus = async (journeyId, known, owner) => {
  if (known != null && known.journeyId === journeyId) return known.status
  const existing = await getFulfilment(journeyId, owner)
  if (existing === undefined) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  return mapStatus(existing.status)
}

const assertWritable = (journeyId, status) => {
  if (status !== DRAFT && status !== AMEND) {
    const reason = status === SUBMITTED ? 'submitted' : status
    throw new Error(`Journey "${journeyId}" is ${reason} — writes blocked`)
  }
}

const getFulfilment = async (journeyId, owner) => {
  const response = await fetch(`${fulfilmentsUrl}/${journeyId}`, {
    method: 'GET',
    headers: headers(owner)
  })
  if (response.status === HTTP_NOT_FOUND) return undefined
  if (!response.ok) throw failed('get fulfilment', response)
  return response.json()
}

const put = async (url, body, action, owner) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: headers(owner),
    body: JSON.stringify(body)
  })
  if (!response.ok) throw failed(action, response)
  return response
}

const putProjection = async ({ journeyId, name, url, body, owner }) => {
  let lastError
  for (let attempt = 1; attempt <= MAX_PROJECTION_ATTEMPTS; attempt++) {
    try {
      await put(url, body, `save ${name} projection`, owner)
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
  const error = markRecoverableBackendError(
    new AggregateError(
      failures.map(({ error: cause }) => cause),
      `Canonical fulfilment "${journeyId}" saved, but projection writes failed: ${failedProjections.join(', ')}`
    )
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
  async create({ userId, owner } = {}) {
    const response = await fetch(fulfilmentsUrl, {
      method: 'POST',
      headers: headers(owner)
    })
    if (!response.ok) throw failed('create fulfilment', response)
    return marshal(await response.json(), userId ?? owner?.sub ?? null)
  },

  async load({ journeyId, userId, owner } = {}) {
    if (journeyId != null) {
      const fulfilment = await getFulfilment(journeyId, owner)
      return fulfilment === undefined
        ? undefined
        : marshal(fulfilment, userId ?? owner?.sub ?? null)
    }
    return undefined
  },

  async list({ owner, page = 1, sort = 'arrivalDate,desc' } = {}) {
    const response = await fetch(
      `${fulfilmentsUrl}?page=${page}&sort=${sort}`,
      {
        method: 'GET',
        headers: headers(owner)
      }
    )
    if (!response.ok) throw failed('list fulfilments', response)
    const result = await response.json()
    return {
      rows: result.items.map(marshalListItem),
      page: result.page,
      size: result.size,
      totalElements: result.totalElements,
      totalPages: result.totalPages
    }
  },

  async has(journeyId, owner) {
    return (await getFulfilment(journeyId, owner)) !== undefined
  },

  async replaceFulfilment(journeyId, fulfilment, { known, owner } = {}) {
    const status = await resolveStatus(journeyId, known, owner)
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
      'save fulfilment',
      owner
    )
    const saved = await canonicalResponse.json()

    const failures = []
    for (const projection of projections) {
      try {
        await putProjection({ journeyId, owner, ...projection })
      } catch (error) {
        failures.push({ name: projection.name, error })
      }
    }
    if (failures.length > 0) {
      throwProjectionFailure(journeyId, failures)
    }

    return marshal(saved, owner?.sub ?? null)
  },

  async finalise(journeyId, owner) {
    const response = await fetch(`${fulfilmentsUrl}/${journeyId}/submit`, {
      method: 'POST',
      headers: headers(owner)
    })
    if (!response.ok) throw failed('submit fulfilment', response)
    return marshal(await response.json(), owner?.sub ?? null)
  },

  async amend(journeyId, owner) {
    const response = await fetch(`${fulfilmentsUrl}/${journeyId}/amend`, {
      method: 'POST',
      headers: headers(owner)
    })
    if (!response.ok) throw failed('amend fulfilment', response)
    return marshal(await response.json(), owner?.sub ?? null)
  },

  async cancelAmend(journeyId, owner) {
    const response = await fetch(
      `${fulfilmentsUrl}/${journeyId}/cancel-amend`,
      {
        method: 'POST',
        headers: headers(owner)
      }
    )
    if (!response.ok) throw failed('cancel amendment', response)
    return marshal(await response.json(), owner?.sub ?? null)
  },

  async copy(journeyId, owner, idempotencyKey) {
    const response = await fetch(`${fulfilmentsUrl}/${journeyId}/copy`, {
      method: 'POST',
      headers: {
        ...headers(owner),
        'Idempotency-Key': idempotencyKey
      }
    })
    if (!response.ok) throw failed('copy fulfilment', response)
    return marshal(await response.json(), owner?.sub ?? null)
  },

  async softDelete(journeyId, owner) {
    const response = await fetch(`${fulfilmentsUrl}/${journeyId}/soft-delete`, {
      method: 'POST',
      headers: headers(owner)
    })
    if (!response.ok) throw failed('soft-delete fulfilment', response)
    return marshal(await response.json(), owner?.sub ?? null)
  },

  async clear() {}
}
