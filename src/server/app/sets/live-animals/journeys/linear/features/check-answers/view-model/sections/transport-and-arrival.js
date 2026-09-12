import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { transitedCountriesApplies } from '../applicability.js'
import { arrivalDetailsCard } from '../cards/movement/arrival-details.js'
import { transitCountriesCard } from '../cards/movement/transit-countries.js'
import { transportDetailsCard } from '../cards/movement/transport-details.js'

const copy = copyFor({ en, cy })

/**
 * Design release 1's third numbered section: how the consignment gets here and
 * when it lands. The transit countries are collected on their own page and
 * apply only to an overland arrival, so they stand as their own headed card
 * rather than as a row inside arrival details.
 */
export const transportAndArrivalSection = (
  journeyId,
  answers,
  scope,
  readOnly
) => ({
  anchor: 'transport-and-arrival',
  heading: copy.sections.transportAndArrival,
  groups: [
    {
      heading: copy.groups.arrivalDetails,
      cards: [arrivalDetailsCard(journeyId, answers, readOnly)]
    },
    ...(transitedCountriesApplies(answers, scope)
      ? [
          {
            heading: copy.groups.transitCountries,
            cards: [transitCountriesCard(journeyId, answers, readOnly)]
          }
        ]
      : []),
    {
      heading: copy.groups.transportDetails,
      cards: [transportDetailsCard(journeyId, answers, scope, readOnly)]
    }
  ]
})
