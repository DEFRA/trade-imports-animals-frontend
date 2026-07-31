import { pagePath } from '../../../../../../../../config.js'
import * as kit from '../../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import * as commodities from '../../../../../../../../services/commodities/index.js'
import { animalIdentificationPage } from '../../page.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { animalsField } from '../fields.js'

const copy = copyFor({ en, cy }).consignmentDetails

export const countDropIssueFor = (request, { index, entry }, values) => {
  const records = (entry.animalIdentifiers ?? []).length
  const value = values[animalsField(index)]
  if (records === 0 || value === '') return []
  const entered = Number(value)
  if (!Number.isInteger(entered) || entered >= records) return []
  const species =
    commodities.speciesLabel(entry.speciesSelection) ?? entry.speciesSelection
  return [
    {
      field: animalsField(index),
      text: copy.errors.countDrop(records, species, entered),
      href: `${kit.withChangeContext(
        request,
        pagePath(request.params.journeyId, animalIdentificationPage.slug)
      )}#identification-card-${index}`
    }
  ]
}

export const countDropIssues = (request, lines, values) =>
  lines.flatMap((line) => countDropIssueFor(request, line, values))
