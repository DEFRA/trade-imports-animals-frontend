import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Boot guard: a feature obligations.js may import only SIDEWAYS — another
 * feature's obligations.js. Reads source text deliberately, not the module
 * graph — a static scan catches a forbidden import even in a feature the
 * barrel forgot to assemble.
 */
const SPIKE_DIR = dirname(fileURLToPath(import.meta.url))
const FEATURES_DIR = join(SPIKE_DIR, 'features')

// Every module specifier a file references — `from '…'` and side-effect `import '…'`.
const SPECIFIER_RE = /(?:from|import)\s*['"]([^'"]+)['"]/g

export const isSidewaysObligationImport = (specifier) =>
  /(^|\/)obligations\.js$/.test(specifier)

export function assertObligationPurity() {
  const offenders = []
  for (const entry of readdirSync(FEATURES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = join(FEATURES_DIR, entry.name, 'obligations.js')
    let source
    try {
      source = readFileSync(file, 'utf8')
    } catch {
      continue // a shell/ending feature (start, hub, cya, confirmation) owns no obligations
    }
    for (const match of source.matchAll(SPECIFIER_RE)) {
      if (!isSidewaysObligationImport(match[1])) {
        offenders.push(
          `features/${entry.name}/obligations.js imports "${match[1]}"`
        )
      }
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      'Obligation model purity violated — a feature obligations.js may import ' +
        'ONLY another feature obligations.js (no view, request, controller, ' +
        `engine, validator or config): ${offenders.join('; ')}`
    )
  }
}
