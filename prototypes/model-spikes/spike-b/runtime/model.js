import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Load the Option B statechart. Plain JSON data; the interpreter executes it. */
const dirname = path.dirname(fileURLToPath(import.meta.url))
const machinePath = path.join(dirname, '..', 'model', 'machine.json')

export const machine = JSON.parse(fs.readFileSync(machinePath, 'utf8'))
