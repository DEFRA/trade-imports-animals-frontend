import * as documentTypes from '../../../../../../../services/document-types/index.js'

// The document-types service is the list, and the page offers all of it: every
// GBN-AG document type is selectable, each one coded on the outbound event from
// the GBN-AG document-type codelist (EUDPA-310). Design release 1 held
// HEALTH_CERTIFICATE back; EUDPA-310 offers it again.
//
// Read at call time, not frozen at module load: the list is service-backed and
// the values are primed at boot.
export const offeredDocumentTypes = () => documentTypes.documentTypes()
