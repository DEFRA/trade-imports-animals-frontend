import * as documentTypes from '../../../../../../../services/document-types/index.js'

// The document-types service is the list; the design decides how much of it
// the trader sees. Design release 1 offers thirteen types — the service enum
// minus HEALTH_CERTIFICATE, which the design keeps for its own internal
// testing release and never puts in front of a trader. A record already
// holding that type still renders (the table reads the label by code); the
// page just never offers it as a new choice.
const NOT_OFFERED = ['HEALTH_CERTIFICATE']

// Read at call time, not frozen at module load: the list is service-backed and
// the values are primed at boot.
export const offeredDocumentTypes = () =>
  documentTypes.documentTypes().filter((code) => !NOT_OFFERED.includes(code))
