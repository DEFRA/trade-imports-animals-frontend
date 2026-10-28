import * as documentTypes from '../../../../../../../services/document-types/index.js'

export const offeredDocumentTypes = () => {
  const typeWithheldFromPage = 'HEALTH_CERTIFICATE'
  return documentTypes
    .documentTypes()
    .filter((code) => code !== typeWithheldFromPage)
}
