import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { obligations } from './model/obligations/obligations.js'
import { assertNoDisplayKeys } from './model/no-display-keys.js'

// Model purity gate: no display logic in the model.
// Two boot-time checks over the live model:
//   - key-level: no `label`/`title`/`hint` etc. on any obligation
//     (assertNoDisplayKeys);
//   - import-level: model/** may import only itself and the sanctioned MDM
//     route `services/<name>/index.js` (assertModelImportBoundary). Anything
//     else — lib/, flow/, engine/, features/, bare modules — fails the boot,
//     not just the test run.

const HERE = dirname(fileURLToPath(import.meta.url))
const MODEL_ROOT = join(HERE, 'model')
const SERVICE_INDEX_PATH = /^services\/[a-z-]+\/index\.js$/

// Static import/re-export specifiers. Two shapes: `import ... from 'x'` /
// `export ... from 'x'` (the clause restricted to binding characters so the
// match can never leap across unrelated code), and side-effect `import 'x'`.
const CLAUSE_IMPORT =
  /^(?:import|export)\s[\w*{},\s]*?from\s+['"]([^'"]+)['"]/gm
const SIDE_EFFECT_IMPORT = /^import\s+['"]([^'"]+)['"]/gm

const specifiersIn = (source) =>
  [
    ...source.matchAll(CLAUSE_IMPORT),
    ...source.matchAll(SIDE_EFFECT_IMPORT)
  ].map((match) => match[1])

const modelSourceFiles = () =>
  readdirSync(MODEL_ROOT, { recursive: true })
    .map(String)
    .filter((path) => path.endsWith('.js') && !path.endsWith('.test.js'))
    .map((path) => join(MODEL_ROOT, path))

const appPath = (absolute) => relative(HERE, absolute).split(sep).join('/')

const insideModel = (absolute) => {
  const fromModel = relative(MODEL_ROOT, absolute)
  return fromModel !== '' && !fromModel.startsWith('..')
}

const isBoundaryViolation = (file, specifier) => {
  if (!specifier.startsWith('.')) return true
  const resolved = resolve(dirname(file), specifier)
  if (insideModel(resolved)) return false
  return !SERVICE_INDEX_PATH.test(appPath(resolved))
}

const violationsIn = (file, read) =>
  specifiersIn(read(file, 'utf8'))
    .filter((specifier) => isBoundaryViolation(file, specifier))
    .map((specifier) => `${appPath(file)} imports '${specifier}'`)

/**
 * Assert every non-test file under model/ imports only intra-model paths or
 * `services/<name>/index.js`. `files`/`read` are injectable so tests can feed
 * fixture sources without touching the real tree.
 *
 * @param {{ files?: string[], read?: (path: string, enc: string) => string }} [deps]
 */
export const assertModelImportBoundary = ({
  files = modelSourceFiles(),
  read = readFileSync
} = {}) => {
  const violations = files.flatMap((file) => violationsIn(file, read))
  if (violations.length > 0) {
    throw new Error(
      'Model import boundary violated — model/** may import only ' +
        'intra-model paths or services/<name>/index.js:\n  ' +
        violations.join('\n  ')
    )
  }
}

export const assertObligationPurity = () => {
  assertNoDisplayKeys(obligations)
  assertModelImportBoundary()
}
