import { getTraceId } from '@defra/hapi-tracing'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import {
  answersToNotification,
  notificationToAnswers
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

const marshal = (notification, userId = null) => {
  const status = mapStatus(notification.status)
  return {
    journeyId: notification.referenceNumber,
    userId,
    status,
    submittedAt: status === SUBMITTED ? (notification.updated ?? null) : null,
    answers: notificationToAnswers(notification)
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

const newestForUser = async () => {
  const response = await fetch(`${notificationsUrl}?sort=updated,desc`, {
    method: 'GET',
    headers: headers()
  })
  if (!response.ok) throw failed('list notifications', response)
  const page = await response.json()
  const list = page?.notifications ?? page?.content ?? []
  return list[0]
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
    if (userId != null) {
      const notification = await newestForUser()
      return notification === undefined
        ? undefined
        : marshal(notification, userId)
    }
    return undefined
  },

  async has(journeyId) {
    return (await getNotification(journeyId)) !== undefined
  },

  async saveAnswers(journeyId, answers) {
    const existing = await getNotification(journeyId)
    if (existing === undefined) {
      throw new Error(`Unknown journey "${journeyId}"`)
    }
    if (mapStatus(existing.status) === SUBMITTED) {
      throw new Error(`Journey "${journeyId}" is submitted — writes blocked`)
    }

    const notification = answersToNotification({
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
