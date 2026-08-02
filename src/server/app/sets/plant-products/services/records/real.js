import { getTraceId } from '@defra/hapi-tracing'

import { projectAnswers } from '../../../../bridge/fulfilments/index.js'
import { AMEND, DRAFT } from '../../../../engine/persistence/records.js'
import {
  HTTP_NOT_FOUND,
  IDEMPOTENCY_KEY_HEADER,
  notificationsUrl,
  tracingHeader
} from './config.js'
import { marshal, marshalListItem } from './marshal.js'
import { toDto } from './mapper/to-dto.js'
import { BACKEND_STATUS, mapStatus } from './status.js'

const headers = (additional = {}) => ({
  'Content-Type': 'application/json',
  [tracingHeader]: getTraceId() ?? '',
  ...additional
})

const failed = (operation, response) =>
  new Error(
    `${operation} failed: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
  )

const expectStatus = (operation, response, expected) => {
  if (!expected.includes(response.status)) throw failed(operation, response)
}

const getNotification = async (journeyId, operation) => {
  const response = await fetch(`${notificationsUrl}/${journeyId}`, {
    method: 'GET',
    headers: headers()
  })
  if (response.status === HTTP_NOT_FOUND) return undefined
  expectStatus(operation, response, [200])
  return response.json()
}

export const create = async (_options) => {
  const response = await fetch(notificationsUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({})
  })
  expectStatus('create notification', response, [201])
  return marshal(await response.json())
}

export const load = async ({ journeyId } = {}) => {
  if (journeyId == null) return undefined
  const dto = await getNotification(journeyId, 'load notification')
  return dto === undefined ? undefined : marshal(dto)
}

export const list = async ({
  page = 1,
  sort = 'arrivalDate,desc',
  referenceNumber
} = {}) => {
  const query = new URLSearchParams({ page: String(page), sort })
  if (referenceNumber) query.set('referenceNumber', referenceNumber)
  const response = await fetch(`${notificationsUrl}?${query}`, {
    method: 'GET',
    headers: headers()
  })
  expectStatus('list notifications', response, [200])
  const result = await response.json()
  return {
    rows: result.content.map(marshalListItem),
    page: result.page,
    size: result.pageSize,
    totalElements: result.totalElements,
    totalPages: result.totalPages
  }
}

export const has = async (journeyId) => {
  const response = await fetch(`${notificationsUrl}/${journeyId}`, {
    method: 'GET',
    headers: headers()
  })
  if (response.status === HTTP_NOT_FOUND) return false
  expectStatus('check notification', response, [200])
  return true
}

const resolveStatus = async (journeyId, known) => {
  if (known !== undefined) return known.status
  const dto = await getNotification(journeyId, 'load notification for write')
  if (dto === undefined) throw new Error(`Unknown journey "${journeyId}"`)
  return mapStatus(dto.status)
}

const assertWritable = (journeyId, status) => {
  if (status !== DRAFT && status !== AMEND) {
    throw new Error(`Journey "${journeyId}" is ${status} — writes blocked`)
  }
}

export const replaceFulfilment = async (
  journeyId,
  fulfilment,
  { known } = {}
) => {
  const status = await resolveStatus(journeyId, known)
  assertWritable(journeyId, status)
  const answers = projectAnswers(structuredClone(fulfilment ?? {}))
  const body = {
    ...toDto(answers),
    // The shipped Java replace endpoint rejects an absent body reference.
    referenceNumber: journeyId
  }
  const response = await fetch(`${notificationsUrl}/${journeyId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body)
  })
  expectStatus('replace notification', response, [200, 201])
  return marshal(await response.json())
}

const transition = async (journeyId, operation, body) => {
  const response = await fetch(`${notificationsUrl}/${journeyId}/status`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body)
  })
  expectStatus(operation, response, [200])
  return marshal(await response.json())
}

export const finalise = async (journeyId) =>
  transition(journeyId, 'finalise notification', {
    status: BACKEND_STATUS.SUBMITTED
  })

export const amend = async (journeyId) =>
  transition(journeyId, 'amend notification', {
    status: BACKEND_STATUS.AMEND
  })

export const cancelAmend = async (journeyId) =>
  transition(journeyId, 'cancel notification amendment', {
    status: BACKEND_STATUS.SUBMITTED,
    discardChanges: true
  })

export const copy = async (journeyId, idempotencyKey) => {
  if (idempotencyKey == null || String(idempotencyKey).trim() === '') {
    throw new Error('Idempotency-Key must not be blank')
  }
  const response = await fetch(`${notificationsUrl}/${journeyId}/copies`, {
    method: 'POST',
    headers: headers({ [IDEMPOTENCY_KEY_HEADER]: idempotencyKey })
  })
  expectStatus('copy notification', response, [201])
  return marshal(await response.json())
}

export const softDelete = async (journeyId) =>
  transition(journeyId, 'soft-delete notification', {
    status: BACKEND_STATUS.DELETED
  })

export const clear = async () => {
  throw new Error('records.clear is not supported in real mode')
}

export const records = {
  create,
  load,
  list,
  has,
  replaceFulfilment,
  finalise,
  amend,
  cancelAmend,
  copy,
  softDelete,
  clear
}
