import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// M3 wiring note (EUDPA-288 inc-007b): this import-specifier assert is
// necessary but not sufficient — REPORT:460-465, it never inspects a key. The
// key-level companion `assertNoDisplayKeys(obligations, domain)` lives in
// `model/no-display-keys.js` and runs today as a vitest gate over the dark
// vendored model. When the model is wired at M3, call it here (over the real
// `model/obligations/obligations.js` + `model/domain/index.js`) so the
// no-display-logic-in-the-model rule fails the boot, not just the test run.

const SPIKE_DIR = dirname(fileURLToPath(import.meta.url))
const FEATURES_DIR = join(SPIKE_DIR, 'features')

const SPECIFIER_RE = /(?:from|import)\s*['"]([^'"]+)['"]/g

export const isSidewaysObligationImport = (specifier) =>
  /(^|\/)obligations\.js$/.test(specifier)

export const isReferenceServiceImport = (specifier) =>
  /(^|\/)services\/[^/]+\/index\.js$/.test(specifier)

const isPermittedObligationImport = (specifier) =>
  isSidewaysObligationImport(specifier) || isReferenceServiceImport(specifier)

export function assertObligationPurity() {
  const offenders = []
  for (const entry of readdirSync(FEATURES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = join(FEATURES_DIR, entry.name, 'obligations.js')
    let source
    try {
      source = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    for (const match of source.matchAll(SPECIFIER_RE)) {
      if (!isPermittedObligationImport(match[1])) {
        offenders.push(
          `features/${entry.name}/obligations.js imports "${match[1]}"`
        )
      }
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      'Obligation model purity violated — a feature obligations.js may import ' +
        'ONLY another feature obligations.js or a reference-data service ' +
        '(services/<name>/index.js) (no view, request, controller, engine, ' +
        `validator or config): ${offenders.join('; ')}`
    )
  }
}
