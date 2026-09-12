import { rowReady } from '../../../../../../../flow/section-status.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { rowStatus, taskRowById } from '../../../flow/task-rows.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

// A row is finished when `rowReady` says so — literally the predicate
// `readyForCheckYourAnswers` applies, imported rather than restated, so a
// notification with no unfinished card is exactly a notification that is ready
// to submit and the two cannot diverge.

/**
 * The review page's cards in page order, each with the task rows whose answers
 * it shows and the id the error summary links to.
 *
 * Every task row appears exactly once — the `#REVIEW_CARDS` suite in
 * `check-answers.test.js` pins that — so "no unfinished card" and
 * `scope.readyForCheckYourAnswers` are the same verdict, and the POST can
 * refuse on the latter knowing the page will name something.
 *
 * The species row pair is the one entry whose anchor is not a card, and the one
 * entry that marks no card at all. Species cards are built one per commodity
 * line and carry no `id`, so `decorateCard` never reaches them: even when lines
 * exist the entry names the outstanding work without marking a card, and it
 * anchors to the heading of the section those answers live in, which always
 * stands. Whether a short species card should be marked in its own right is an
 * open question on inc-150.
 *
 * The transit-countries card is the one entry whose card is conditional: it is
 * built only while the answer is in scope, and while it is out of scope its
 * task row is NA, so `incompleteCardErrors` never names a card that is not on
 * the page.
 */
export const REVIEW_CARDS = [
  { id: 'importDetails', anchor: 'import-details', rows: ['origin'] },
  {
    id: 'reasonForImport',
    anchor: 'reason-for-import',
    rows: ['importReason']
  },
  {
    id: 'species',
    anchor: 'description-of-the-goods',
    rows: ['commodities', 'animalIdentification']
  },
  {
    id: 'additionalAnimalDetails',
    anchor: 'additional-animal-details',
    rows: ['additionalDetails']
  },
  {
    id: 'arrivalDetails',
    anchor: 'arrival-details',
    rows: ['arrivalDetails']
  },
  {
    id: 'transitCountries',
    anchor: 'transit-countries',
    rows: ['transitCountries']
  },
  {
    id: 'transportDetails',
    anchor: 'transport-details',
    rows: ['transporter']
  },
  { id: 'documents', anchor: 'documents', rows: ['documents'] },
  {
    id: 'rolesAndAddresses',
    anchor: 'roles-and-addresses',
    rows: ['addresses']
  },
  { id: 'contactAddress', anchor: 'contact-address', rows: ['contact'] }
]

const cardById = new Map(REVIEW_CARDS.map((card) => [card.id, card]))

const cardUnfinished = (card, answers, scope, evaluation) =>
  card.rows.some(
    (rowId) =>
      !rowReady(
        rowStatus(taskRowById(rowId), answers, scope.inScope, evaluation)
      )
  )

/**
 * The cards that still have answers outstanding, in page order.
 *
 * @param {object} answers - the nested answer POJO.
 * @param {object} scope - the request scope (`inScope` is the pathKey Set).
 * @param {object} evaluation - the request-level evaluator result.
 * @returns {object} map of card id to message. Empty means nothing is missing.
 */
export const incompleteCardErrors = (answers, scope, evaluation) =>
  Object.fromEntries(
    REVIEW_CARDS.filter((card) =>
      cardUnfinished(card, answers, scope, evaluation)
    ).map((card) => [card.id, copy.errors.cards[card.id]])
  )

/** The in-page target for a card error, or undefined for a key that is not a
 * card — which is how the error summary tells the two kinds of entry apart. */
export const cardAnchorHref = (key) => {
  const card = cardById.get(key)
  return card ? `#${card.anchor}` : undefined
}

const decorateCard = (card, cardErrors) => {
  const known = cardById.get(card.id)
  if (!known) {
    return card
  }
  return { ...card, anchor: known.anchor, error: cardErrors[card.id] ?? null }
}

/** Give every card its anchor, and the unfinished ones their own message. The
 * decoration is a pass over the built sections rather than another argument
 * threaded through every card factory. */
export const withCardErrors = (sections, cardErrors = {}) =>
  sections.map((section) => ({
    ...section,
    groups: section.groups.map((group) => ({
      ...group,
      cards: group.cards.map((card) => decorateCard(card, cardErrors))
    }))
  }))
