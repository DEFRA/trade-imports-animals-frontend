import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { offeredDocumentTypes } from '../../contracts/document-type-options.js'

const copy = copyFor({ en, cy })

// A placeholder first, then the offered types in the service's order. The
// placeholder carries no value, so a form left on it submits an empty type
// and the add rules say so.
export const documentTypeItems = () => [
  { value: '', text: copy.documentType.placeholder },
  ...offeredDocumentTypes().map((code) => ({
    value: code,
    text: copy.types[code]
  }))
]
