import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Load the Option D annotations (flow metadata). The schema lives in validation/. */
const dirname = path.dirname(fileURLToPath(import.meta.url))
export const annotations = JSON.parse(
  fs.readFileSync(path.join(dirname, '..', 'model', 'annotations.json'), 'utf8')
)
