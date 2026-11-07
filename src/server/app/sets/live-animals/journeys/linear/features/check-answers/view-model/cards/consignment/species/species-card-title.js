import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as sharedEn } from '../../../../../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../../../../../shared/copy.cy.js'
import { lineTitle } from '../../../../../commodities/line-title.js'

const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

export const speciesCardTitle = (entry) =>
  (entry.commodityCode ?? '').trim()
    ? lineTitle(entry)
    : sharedCopy.notApplicable
