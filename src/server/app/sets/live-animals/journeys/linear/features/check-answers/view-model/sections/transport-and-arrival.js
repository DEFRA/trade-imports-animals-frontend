import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { arrivalDetailsCard } from '../cards/movement/arrival-details.js'
import { transportDetailsCard } from '../cards/movement/transport-details.js'

const copy = copyFor({ en, cy })

/**
 * Design release 2.1's third numbered section: how the consignment gets here
 * and when it lands. The transit countries are collected on their own page and
 * apply only to an overland arrival, so they read inside the arrival details
 * card rather than as a card of their own.
 */
export const transportAndArrivalSection = async (
  journeyId,
  answers,
  scope,
  readOnly
) => ({
  anchor: 'transport-and-arrival',
  heading: copy.sections.transportAndArrival,
  cards: [
    await arrivalDetailsCard(journeyId, answers, scope, readOnly),
    transportDetailsCard(journeyId, answers, scope, readOnly)
  ]
})
