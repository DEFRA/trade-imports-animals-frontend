import { getTraceId } from '@defra/hapi-tracing'

const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'
const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'

const failed = (action, response) => {
  const error = new Error(
    `Failed to ${action}: ${response.status} ${response.statusText}`
  )
  error.status = response.status
  error.statusText = response.statusText
  return error
}

const traceHeaders = (contentType) => ({
  ...(contentType ? { 'Content-Type': contentType } : {}),
  [tracingHeader]: getTraceId() ?? ''
})

const initiate = async ({
  journeyId,
  documentType,
  documentReference,
  dateOfIssue,
  maxFileSize,
  mimeTypes
}) => {
  const response = await fetch(
    `${backendBaseUrl}/notifications/${journeyId}/document-uploads`,
    {
      method: 'POST',
      headers: traceHeaders('application/json'),
      body: JSON.stringify({
        documentType,
        documentReference,
        dateOfIssue,
        maxFileSize,
        mimeTypes
      })
    }
  )
  if (!response.ok) throw failed('initiate document upload', response)
  return response.json()
}

const uploadFile = async (uploadId, { filename, contentType, bytes }) => {
  const formData = new FormData()
  formData.append(
    'file',
    new Blob([bytes], { type: contentType ?? 'application/octet-stream' }),
    filename ?? 'upload'
  )
  const response = await fetch(
    `${backendBaseUrl}/document-uploads/${uploadId}/file`,
    {
      method: 'POST',
      headers: traceHeaders(),
      body: formData
    }
  )
  if (!response.ok) throw failed('upload document file', response)
}

export const documentUploads = {
  async upload(details) {
    const { uploadId } = await initiate(details)
    await uploadFile(uploadId, details)
    return uploadId
  },

  async scanStatus({ uploadId }) {
    const response = await fetch(
      `${backendBaseUrl}/document-uploads/${uploadId}`,
      { method: 'GET', headers: traceHeaders() }
    )
    if (!response.ok) throw failed('get document upload status', response)
    const { scanStatus } = await response.json()
    return scanStatus
  },

  async remove(uploadId) {
    const response = await fetch(
      `${backendBaseUrl}/document-uploads/${uploadId}`,
      { method: 'DELETE', headers: traceHeaders() }
    )
    if (!response.ok) throw failed('delete document upload', response)
  }
}
