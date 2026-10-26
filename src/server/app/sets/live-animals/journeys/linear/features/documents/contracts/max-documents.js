import { documents } from '../../../../../obligations/index.js'

export const MAX_DOCUMENTS = documents.requires.maxEntries

export const atDocumentCapacity = (addedDocuments) =>
  addedDocuments.length >= MAX_DOCUMENTS
