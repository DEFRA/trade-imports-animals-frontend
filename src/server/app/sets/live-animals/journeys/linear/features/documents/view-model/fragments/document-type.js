import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { documentTypes } from '../../../../../../../../services/document-types/index.js'

const copy = copyFor({ en, cy })

export const documentTypeItems = () => [
  { value: '', text: copy.documentType.selectText },
  ...documentTypes().map((code) => ({
    value: code,
    text: copy.types[code]
  }))
]
