import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Load the Option A journey model. It is a plain JSON **data** file with no code;
 * this adapter is the only thing that executes. Reading it through `fs` (rather
 * than `import`) keeps the data/adapter split honest — `dump.js` and a non-JS
 * consumer would read the very same file.
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))
const modelPath = path.join(dirname, '..', 'model', 'journey.json')

export const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'))

export const stepById = new Map(model.steps.map((step) => [step.id, step]))
export const stepOrder = model.steps.map((step) => step.id)
