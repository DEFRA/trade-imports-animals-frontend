import { getTraceId } from '@defra/hapi-tracing'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import {
  answersToTargetNotification,
  targetNotificationToAnswers
} from './notification-mapper.js'

const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'
const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'

const notificationsUrl = `${backendBaseUrl}/notifications`

const BACKEND_SUBMITTED = 'SUBMITTED'

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

const stripNulls = (value) => {
  if (Array.isArray(value)) {
    return value.map(stripNulls)
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([key, v]) => [key, stripNulls(v)])
    )
  }
  return value
}

const marshal = (notification, userId = null) => {
  const status = mapStatus(notification.status)
  return {
    journeyId: notification.referenceNumber,
    userId,
    status,
    submittedAt: status === SUBMITTED ? (notification.updated ?? null) : null,
    answers: stripNulls(targetNotificationToAnswers(notification))
  }
}

const getNotification = async (referenceNumber) => {
  const response = await fetch(`${notificationsUrl}/${referenceNumber}`, {
    method: 'GET',
    headers: headers()
  })
  if (response.status === 404) return undefined
  if (!response.ok) throw failed('get notification', response)
  return response.json()
}

export const records = {
  async create({ userId } = {}) {
    const response = await fetch(notificationsUrl, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({})
    })
    if (!response.ok) throw failed('create notification', response)
    const notification = await response.json()
    return {
      journeyId: notification.referenceNumber,
      userId: userId ?? null,
      status: IN_PROGRESS,
      submittedAt: null,
      answers: {}
    }
  },

  async load({ journeyId, userId } = {}) {
    if (journeyId != null) {
      const notification = await getNotification(journeyId)
      return notification === undefined
        ? undefined
        : marshal(notification, userId ?? null)
    }
    return undefined
  },

  async has(journeyId) {
    return (await getNotification(journeyId)) !== undefined
  },

  async saveAnswers(journeyId, answers, { known } = {}) {
    let status
    if (known != null && known.journeyId === journeyId) {
      status = known.status
    } else {
      const existing = await getNotification(journeyId)
      if (existing === undefined) {
        throw new Error(`Unknown journey "${journeyId}"`)
      }
      status = mapStatus(existing.status)
    }
    if (status === SUBMITTED) {
      throw new Error(`Journey "${journeyId}" is submitted — writes blocked`)
    }

    const notification = answersToTargetNotification({
      ...answers,
      referenceNumber: journeyId
    })
    const response = await fetch(notificationsUrl, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(notification)
    })
    if (!response.ok) throw failed('save notification', response)
    return marshal(await response.json())
  },

  async finalise(journeyId) {
    const response = await fetch(`${notificationsUrl}/${journeyId}/submit`, {
      method: 'POST',
      headers: headers()
    })
    if (!response.ok) throw failed('submit notification', response)
    return marshal(await response.json())
  },

  async clear() {}
}
