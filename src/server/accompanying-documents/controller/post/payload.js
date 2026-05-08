import { setSessionValue } from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'

const REMOVE_ACTION_PREFIX = 'remove-'

export const isRemoveAction = (action) =>
  typeof action === 'string' && action.startsWith(REMOVE_ACTION_PREFIX)

export const parseRemoveUploadId = (action) =>
  action.slice(REMOVE_ACTION_PREFIX.length)

export const extractFormFields = (payload) => ({
  documentType: payload.documentType,
  documentReference: payload.documentReference,
  issueDateDay: payload['issueDate-day'],
  issueDateMonth: payload['issueDate-month'],
  issueDateYear: payload['issueDate-year'],
  crumb: payload.crumb,
  fileData: payload.file
})

export const formatDateOfIssue = ({
  issueDateDay,
  issueDateMonth,
  issueDateYear
}) => {
  const year = String(issueDateYear).padStart(4, '0')
  const month = String(issueDateMonth).padStart(2, '0')
  const day = String(issueDateDay).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const persistDocument = (request, documents, doc) => {
  documents.push(doc)
  setSessionValue(request, sessionKeys.documents, documents)
}

export const buildUploadDetails = (fields, dateOfIssue) => ({
  documentType: fields.documentType,
  documentReference: fields.documentReference,
  dateOfIssue
})

export const buildSessionDocument = (uploadId, fields, dateOfIssue) => ({
  uploadId,
  filename: fields.fileData.filename ?? 'upload',
  documentType: fields.documentType,
  documentReference: fields.documentReference,
  dateOfIssue
})
