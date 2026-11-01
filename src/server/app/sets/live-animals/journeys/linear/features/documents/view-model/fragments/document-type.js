import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { offeredDocumentTypes } from '../../contracts/document-type-options.js'

const copy = copyFor({ en, cy })

export const documentTypeItems = () => [
  { value: '', text: copy.documentType.selectText },
  ...offeredDocumentTypes().map((code) => ({
    value: code,
    text: copy.types[code]
  }))
]
