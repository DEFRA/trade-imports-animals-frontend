import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { cardForPageId } from './incomplete-cards.js'

const copy = copyFor({ en, cy })

/** Roll a per-page failure list up to one message per review card. Pages
 * whose id has no card mapping are dropped defensively; the pinning test in
 * features/index.test.js keeps that set empty in practice. */
export const invalidCardErrors = (perPageErrors) => {
  const cardIds = new Set()
  for (const { id: pageId } of perPageErrors) {
    const cardId = cardForPageId(pageId)
    if (cardId) {
      cardIds.add(cardId)
    }
  }
  return Object.fromEntries(
    [...cardIds].map((cardId) => [cardId, copy.errors.invalidCards[cardId]])
  )
}
