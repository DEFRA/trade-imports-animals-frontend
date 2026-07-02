/**
 * Barrel for the canonicalise-and-write folder-module: the form-name
 * convention (field-names.js), per-type canonical values
 * (canonical-value.js), the page POST writer (page-answers.js) and the
 * indexed add/remove/reviewed lifecycle (indexed-collection.js).
 */

export { decodeFieldName, encodeFieldName } from './field-names.js'
export { applyAnswers } from './page-answers.js'
export {
  addFulfilment,
  markCollectionReviewed,
  removeFulfilment
} from './indexed-collection.js'
