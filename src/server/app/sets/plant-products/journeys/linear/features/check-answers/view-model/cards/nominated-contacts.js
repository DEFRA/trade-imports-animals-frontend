import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { changeHref } from '../rows/change-link.js'
import { yesNoText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })
const cardCopy = copy.cards.nominatedContacts
const cell = (text) => ({ text: String(text ?? '') })

export const nominatedContactsCard = (journeyId, answers, evaluation) => {
  const contacts = state.collectionView(
    answers,
    ['nominatedContacts'],
    evaluation
  )
  return {
    heading: cardCopy.heading,
    rows: [],
    tables: contacts.length
      ? [
          {
            caption: cardCopy.heading,
            captionClasses: 'govuk-visually-hidden',
            head: Object.values(cardCopy.columns).map((text) => ({ text })),
            rows: contacts.map(({ entry }) => [
              cell(entry.contactName),
              cell(entry.contactEmail),
              cell(entry.contactTelephone),
              cell(yesNoText(entry.contactIsAgent, copy.yesNo))
            ])
          }
        ]
      : [],
    empty: contacts.length ? null : cardCopy.empty,
    action: {
      href: changeHref('nominatedContacts', journeyId),
      text: copy.change,
      visuallyHiddenText: cardCopy.change
    }
  }
}
