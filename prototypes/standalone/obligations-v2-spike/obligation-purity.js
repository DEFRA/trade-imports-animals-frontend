import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * THE per-file model-purity guard (re-pointed for the feature model).
 *
 * v2's load-bearing guardrail is that the obligation model imports NOTHING
 * outward — no view, request, error, controller, engine, validator or config.
 * In the old central `registry.js` that was one file to eyeball. Now the obligations
 * are co-located next to controllers that DO import Hapi/views, so the guard
 * moves with them: it checks EVERY `features/<feature>/obligations.js` and
 * asserts each imports only SIDEWAYS — another feature's obligations.js.
 *
 * This is the check that co-location has not re-coupled the model to
 * presentation (the rejected "model-dispatch" design). It runs at boot from
 * routes.js and is exercised by `obligation-purity.test.js`.
 *
 * It reads source rather than the module graph deliberately: a static text
 * scan catches a forbidden import even in a feature the barrel forgot to
 * assemble, and needs no runtime resolution of the offending module.
 */
const SPIKE_DIR = dirname(fileURLToPath(import.meta.url))
const FEATURES_DIR = join(SPIKE_DIR, 'features')

// Every module specifier a file references — `from '…'` and side-effect `import '…'`.
const SPECIFIER_RE = /(?:from|import)\s*['"]([^'"]+)['"]/g

/** An obligations file may import ONLY another feature's obligations.js. */
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
