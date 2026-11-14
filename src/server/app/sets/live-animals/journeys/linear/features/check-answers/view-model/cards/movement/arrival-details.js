import * as countries from '../../../../../../../../../services/countries/index.js'
import * as ports from '../../../../../../../../../services/ports/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import {
  portOfEntryPage,
  transitCountriesPage
} from '../../../../transport/page.js'
import { meansOfTransportLabel } from '../../../../transport/means-of-transport-label.js'
import { transitedCountriesApplies } from '../../applicability.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { dateText, toArray } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

const transitCountriesGroups = async ({
  journeyId,
  changeLinkTrail,
  answers,
  scope,
  readOnly
}) => {
  if (!transitedCountriesApplies(answers, scope)) {
    return []
  }
  const labels = await Promise.all(
    toArray(answers.transitedCountries).map(countries.countryDisplayLabel)
  )
  return [
    {
      heading: copy.groups.transitCountries,
      rows: [
        {
          ...row(copy.rows.transitedCountries, labels.join(', ')),
          ...editableActions({
            readOnly,
            actions: changeAction(
              { journeyId, changeLinkTrail },
              transitCountriesPage.slug,
              copy.hidden.rows.transitCountries
            )
          })
        }
      ]
    }
  ]
}

/**
 * Where and when the consignment lands, what it arrives on and, when transit
 * countries apply, the countries it travels through.
 */
export const arrivalDetailsCard = async ({
  journeyId,
  changeLinkTrail,
  answers,
  scope,
  readOnly
}) => ({
  id: 'arrivalDetails',
  title: copy.cards.arrivalDetails,
  ...editableActions({
    readOnly,
    actions: changeAction(
      { journeyId, changeLinkTrail },
      portOfEntryPage.slug,
      copy.hidden.cards.arrivalDetails
    )
  }),
  rows: [
    row(
      copy.rows.portOfEntry,
      (await ports.label(answers.portOfEntry)) ?? answers.portOfEntry
    ),
    row(copy.rows.arrivalDate, dateText(answers.arrivalDateAtPort)),
    row(
      copy.rows.meansOfTransport,
      meansOfTransportLabel(answers.meansOfTransport)
    ),
    row(copy.rows.transportIdentification, answers.transportIdentification),
    row(
      copy.rows.transportDocumentReference,
      answers.transportDocumentReference
    )
  ],
  groups: await transitCountriesGroups({
    journeyId,
    changeLinkTrail,
    answers,
    scope,
    readOnly
  })
})
