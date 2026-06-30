import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Dead-simple JSON-file "database" shared by every car insurance prototype
 * variant. The whole datastore is a single array persisted to data/quotes.json.
 *
 * Deliberately not a real database — it exists only so the prototypes can create
 * and persist quotes while you play with the journeys. Not safe for concurrency,
 * not for production, never merged.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const dbFile = path.join(dirname, 'data', 'quotes.json')

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'))
  } catch {
    return []
  }
}

function writeAll(quotes) {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true })
  fs.writeFileSync(dbFile, `${JSON.stringify(quotes, null, 2)}\n`)
}

export function listQuotes() {
  return readAll()
}

export function findQuote(id) {
  return readAll().find((quote) => quote.id === id)
}

export function createDraft(variant) {
  const now = new Date().toISOString()
  const draft = {
    id: randomUUID(),
    variant,
    reference: null,
    status: 'draft',
    createdAt: now,
    updatedAt: now
  }
  const quotes = readAll()
  quotes.push(draft)
  writeAll(quotes)
  return draft
}

export function updateQuote(id, patch) {
  const quotes = readAll()
  const quote = quotes.find((item) => item.id === id)
  if (!quote) {
    return undefined
  }
  Object.assign(quote, patch, { updatedAt: new Date().toISOString() })
  writeAll(quotes)
  return quote
}
