import { getTraceId } from '@defra/hapi-tracing'

import { projectAnswers } from '../../../../bridge/fulfilments/index.js'
import { AMEND, DRAFT } from '../../../../engine/persistence/records.js'
import { markRecoverableBackendError } from '../../../../services/persistence/records/errors.js'
import {
  HTTP_NOT_FOUND,
  IDEMPOTENCY_KEY_HEADER,
  notificationsUrl,
  tracingHeader
} from './config.js'
import { marshal, marshalListItem } from './marshal.js'
import { fromDto } from './mapper/from-dto.js'
import { documentToDto, toDto } from './mapper/to-dto.js'
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

const expectRecoverableStatus = (operation, response, expected) => {
  if (!expected.includes(response.status)) {
    throw markRecoverableBackendError(failed(operation, response))
  }
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

const documentsUrl = (journeyId) =>
  `${notificationsUrl}/${journeyId}/accompanying-documents`

const listDocuments = async (journeyId) => {
  const response = await fetch(documentsUrl(journeyId), {
    method: 'GET',
    headers: headers()
  })
  expectStatus('list accompanying documents', response, [200])
  return (await response.json()).documents
}

const deleteDocument = async (journeyId, documentId) => {
  const response = await fetch(`${documentsUrl(journeyId)}/${documentId}`, {
    method: 'DELETE',
    headers: headers()
  })
  expectStatus('delete accompanying document', response, [204])
}

const createDocument = async (journeyId, entry) => {
  const response = await fetch(documentsUrl(journeyId), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(documentToDto(entry))
  })
  expectStatus('create accompanying document', response, [201])
}

const reloadNotification = async (journeyId) => {
  const response = await fetch(`${notificationsUrl}/${journeyId}`, {
    method: 'GET',
    headers: headers()
  })
  expectStatus('reload notification', response, [200])
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

const buildNotificationBody = (journeyId, answers) => ({
  ...toDto(answers),
  // The shipped Java replace endpoint rejects an absent body reference.
  referenceNumber: journeyId
})

export const replaceFulfilment = async (
  journeyId,
  fulfilment,
  { known } = {}
) => {
  const status = await resolveStatus(journeyId, known)
  assertWritable(journeyId, status)
  const answers = projectAnswers(structuredClone(fulfilment ?? {}))
  const documents = answers.accompanyingDocuments ?? []
  const body = buildNotificationBody(journeyId, answers)
  const response = await fetch(`${notificationsUrl}/${journeyId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body)
  })
  expectStatus('replace notification', response, [200, 201])
  const existingDocuments = await listDocuments(journeyId)
  for (const document of existingDocuments) {
    await deleteDocument(journeyId, document.id)
  }
  for (const document of documents) {
    await createDocument(journeyId, document)
  }
  return marshal(await reloadNotification(journeyId))
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

export const finalise = async (journeyId) => {
  const loadResponse = await fetch(`${notificationsUrl}/${journeyId}`, {
    method: 'GET',
    headers: headers()
  })
  expectRecoverableStatus('finalise notification', loadResponse, [200])
  const body = buildNotificationBody(
    journeyId,
    fromDto(await loadResponse.json())
  )
  body.declaration = {
    agreed: true,
    declaredAt: new Date().toISOString()
  }

  const documentResponse = await fetch(`${notificationsUrl}/${journeyId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body)
  })
  expectRecoverableStatus('finalise notification', documentResponse, [200, 201])

  const statusResponse = await fetch(
    `${notificationsUrl}/${journeyId}/status`,
    {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ status: BACKEND_STATUS.SUBMITTED })
    }
  )
  expectRecoverableStatus('finalise notification', statusResponse, [200])
  return marshal(await statusResponse.json())
}

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
