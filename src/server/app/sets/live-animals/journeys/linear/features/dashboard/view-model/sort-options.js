import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { NOTIFICATION_SORT_OPTIONS } from '../notification-helper.js'

const copy = copyFor({ en, cy })

const sortOptionText = [
  copy.sort.options.arrivalNewest,
  copy.sort.options.arrivalOldest,
  copy.sort.options.createdNewest,
  copy.sort.options.createdOldest
]

export const sortOptions = NOTIFICATION_SORT_OPTIONS.map((option, index) => ({
  ...option,
  text: sortOptionText[index]
}))
