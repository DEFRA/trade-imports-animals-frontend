import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Load the Option C model — the data model (fields) and the rules layer. */
const dirname = path.dirname(fileURLToPath(import.meta.url))
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(dirname, '..', 'model', name), 'utf8'))

const fieldsDoc = read('fields.json')
const rulesDoc = read('rules.json')

export const steps = fieldsDoc.steps
export const fields = fieldsDoc.fields
export const patterns = fieldsDoc.patterns
export const rules = rulesDoc.rules

export const stepById = new Map(steps.map((step) => [step.id, step]))
