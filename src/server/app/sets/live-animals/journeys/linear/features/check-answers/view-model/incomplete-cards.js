import { rowReady } from '../../../../../../../flow/section-status.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { rowStatus, taskRowById } from '../../../flow/task-rows.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { missingCell } from './rows/value-text.js'
import { speciesBlockHref } from './species-errors.js'

const copy = copyFor({ en, cy })

/**
 * The review page's cards in page order, each with the task rows whose answers
 * it shows and the id the error summary links to.
 */
export const REVIEW_CARDS = [
  { id: 'originOfImport', anchor: 'origin-of-import', rows: ['origin'] },
  {
    id: 'whatAreYouImporting',
    anchor: 'what-are-you-importing',
    rows: ['commodities']
  },
  {
    id: 'mainImportReason',
    anchor: 'main-import-reason',
    rows: ['importReason']
  },
  {
    id: 'commodityDetails',
    anchor: 'commodity-details',
    fallbackAnchor: 'description-of-the-goods',
    rows: ['consignmentDetails', 'animalIdentification']
  },
  {
    id: 'additionalDetails',
    anchor: 'additional-details',
    rows: ['additionalDetails']
  },
  {
    id: 'arrivalDetails',
    anchor: 'arrival-details',
    rows: ['arrivalDetails', 'transitCountries']
  },
  {
    id: 'transportDetails',
    anchor: 'transport-details',
    rows: ['transporter']
  },
  { id: 'documents', anchor: 'documents', rows: ['documents'] },
  {
    id: 'addresses',
    anchor: 'addresses',
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

export const reviewCardAnchor = (id) => cardById.get(id).anchor

const cardHref = (card, pageAnchors) =>
  pageAnchors.has(card.anchor) || !card.fallbackAnchor
    ? `#${card.anchor}`
    : `#${card.fallbackAnchor}`

/**
 * The in-page target for a review error key.
 *
 * @param {string} key - a card id or a per-species key.
 * @param {Set<string>} pageAnchors - the anchors the page carries.
 * @returns {string|undefined} a card key resolves to its card's anchor or,
 * when the page carries none, its fallback; a per-species key resolves to its
 * species block's anchor; any other key to undefined.
 */
export const cardAnchorHref = (key, pageAnchors) => {
  const card = cardById.get(key)
  return card ? cardHref(card, pageAnchors) : speciesBlockHref(key)
}

const isEmptyRow = (row) => row.value?.empty === true

const blankEmptyRows = (rows) =>
  Array.isArray(rows)
    ? rows.map((row) =>
        isEmptyRow(row) ? { ...row, value: missingCell() } : row
      )
    : rows

const blankEmptyValues = (card) => ({
  ...card,
  rows: blankEmptyRows(card.rows),
  ...(Array.isArray(card.groups)
    ? {
        groups: card.groups.map((group) => ({
          ...group,
          rows: blankEmptyRows(group.rows)
        }))
      }
    : {})
})

const decorateCard = (card, cardErrors) => {
  const known = cardById.get(card.id)
  if (!known) {
    return card
  }
  const decorated = {
    ...card,
    anchor: known.anchor,
    error: cardErrors[card.id] ?? null
  }
  return decorated.error ? blankEmptyValues(decorated) : decorated
}

/** Give every card its anchor, and the unfinished ones their own message. */
export const withCardErrors = (sections, cardErrors = {}) =>
  sections.map((section) => ({
    ...section,
    cards: section.cards.map((card) => decorateCard(card, cardErrors))
  }))
