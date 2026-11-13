import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { transitedCountriesApplies } from '../applicability.js'
import { arrivalDetailsCard } from '../cards/movement/arrival-details.js'
import { transitCountriesCard } from '../cards/movement/transit-countries.js'
import { transportDetailsCard } from '../cards/movement/transport-details.js'

const copy = copyFor({ en, cy })

export const transportAndArrivalSection = async ({
  journeyId,
  changeLinkTrail,
  answers,
  scope,
  readOnly
}) => ({
  anchor: 'transport-and-arrival',
  heading: copy.sections.transportAndArrival,
  cards: [
    await arrivalDetailsCard({
      journeyId,
      changeLinkTrail,
      answers,
      readOnly
    }),
    ...(transitedCountriesApplies(answers, scope)
      ? [
          await transitCountriesCard({
            journeyId,
            changeLinkTrail,
            answers,
            readOnly
          })
        ]
      : []),
    transportDetailsCard({
      journeyId,
      changeLinkTrail,
      answers,
      scope,
      readOnly
    })
  ]
})
