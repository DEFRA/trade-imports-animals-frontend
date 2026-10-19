import { rowReady } from '../../../../../../../flow/section-status.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { rowStatus, taskRowById } from '../../../flow/task-rows.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { missingCell } from './rows/value-text.js'

const copy = copyFor({ en, cy })

/**
 * The review page's cards in page order, each with the task rows whose answers
 * it shows and the id the error summary links to.
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
    rows: ['commodities', 'consignmentDetails', 'animalIdentification']
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
 * card. */
export const cardAnchorHref = (key) => {
  const card = cardById.get(key)
  return card ? `#${card.anchor}` : undefined
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
  ...(Array.isArray(card.documents)
    ? {
        documents: card.documents.map((document) => ({
          ...document,
          rows: blankEmptyRows(document.rows)
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
    groups: section.groups.map((group) => ({
      ...group,
      cards: group.cards.map((card) => decorateCard(card, cardErrors))
    }))
  }))
