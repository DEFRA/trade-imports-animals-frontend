import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const load = (file) =>
  JSON.parse(readFileSync(join(HERE, 'fixtures', file), 'utf8'))

// The single canned reference dataset — captured from real reference-data by
// capture.js and committed under fixtures/. The service stubs seed from here so
// stub data and the captured real data cannot drift.
export const countriesOrigin = load('countries-origin.json')
export const portsOfEntry = load('ports-of-entry.json')
