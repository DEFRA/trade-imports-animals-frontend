/**
 * Model purity — key-level display-key ban.
 *
 * Enforces the ruling "No display logic in the model." The import-specifier
 * guard in `obligation-purity.js` is necessary but not sufficient — it never
 * inspects a key, so it would not catch someone adding `titleKey:` or
 * `label:` directly onto an obligation or domain entry.
 *
 * This checker adds the key-level teeth. It walks the LIVE obligation and
 * domain objects (not their source text) and reports any object that carries
 * a display key. Object-scoped by design: the `analysis/` tree carries
 * engine-introspection constants (`OPERATOR_LABELS`, helper-type "labels")
 * that NAME AST operators — a source grep would false-positive on them, but
 * they are structurally unreachable from the obligation + domain object
 * graphs this walk is handed, so they cannot.
 *
 * Pure and argument-driven so the vitest gate and the boot-time enforcement
 * (`obligation-purity.js`, run at plugin registration via `routes.js`) call
 * the same code: pass the real `obligations` array and `domain` map in.
 */

// Display keys banned anywhere on an obligation or domain entry. Extend this
// list if a new display-ish key appears in the model.
export const DISPLAY_KEYS = Object.freeze([
  'label',
  'title',
  'titleKey',
  'hint',
  'legend',
  'widget'
])

// Objects, arrays and functions are all walkable — functions because gate
// helpers hang a `.metadata` sidecar off the returned `applyTo` closure, and
// a display key hidden inside a gate decision must be caught too.
const isWalkable = (value) =>
  value !== null && (typeof value === 'object' || typeof value === 'function')

const arrayChildEntries = (value, path) =>
  value.map((item, index) => [`${path}[${index}]`, item])

const mapChildEntries = (value, path) =>
  [...value.entries()].map(([key, entry]) => [`${path}[${String(key)}]`, entry])

// Own enumerable string-keyed properties — for a plain object its data, for
// a function only the explicitly-assigned sidecars (`.metadata`); intrinsic
// non-enumerable function props (`name`, `length`) are skipped.
const entriesOf = (value, path) =>
  Object.entries(value).map(([key, child]) => [key, `${path}.${key}`, child])

const walk = (value, path, banned, seen, offenders) => {
  if (!isWalkable(value)) return
  if (seen.has(value)) return
  seen.add(value)

  if (Array.isArray(value)) {
    for (const [childPath, item] of arrayChildEntries(value, path)) {
      walk(item, childPath, banned, seen, offenders)
    }
    return
  }

  if (value instanceof Map) {
    for (const [childPath, entry] of mapChildEntries(value, path)) {
      walk(entry, childPath, banned, seen, offenders)
    }
    return
  }

  for (const [key, childPath, child] of entriesOf(value, path)) {
    if (banned.has(key)) offenders.push(childPath)
    walk(child, childPath, banned, seen, offenders)
  }
}

/**
 * findDisplayKeyOffenders — walk the obligation and domain object graphs and
 * return the path of every banned display key found. Empty array ⇒ clean.
 *
 * @param {object[]} obligations — the obligations manifest array.
 * @param {Map<string, object>|object} domain — the domain map (id → entry),
 *   or a plain object of the same shape.
 * @param {Iterable<string>} [bannedKeys] — override the banned-key set.
 * @returns {string[]} offending paths (e.g. `obligations[cph].label`).
 */
export function findDisplayKeyOffenders(
  obligations,
  domain,
  bannedKeys = DISPLAY_KEYS
) {
  const banned = new Set(bannedKeys)
  const seen = new WeakSet()
  const offenders = []

  for (const obligation of Array.isArray(obligations) ? obligations : []) {
    const id = obligation?.name ?? obligation?.id ?? '?'
    walk(obligation, `obligations[${id}]`, banned, seen, offenders)
  }

  const domainEntries =
    domain instanceof Map ? [...domain.entries()] : Object.entries(domain ?? {})
  for (const [id, entry] of domainEntries) {
    walk(entry, `domain[${String(id)}]`, banned, seen, offenders)
  }

  return offenders
}

/**
 * assertNoDisplayKeys — throw if any obligation or domain entry carries a
 * display key. This is the form M3 wires into `obligation-purity.js` so the
 * key-level check fails the boot the same way the import-specifier assert
 * does.
 *
 * @param {object[]} obligations — the obligations manifest array.
 * @param {Map<string, object>|object} domain — the domain map (id → entry).
 * @param {Iterable<string>} [bannedKeys] — override the banned-key set.
 */
export function assertNoDisplayKeys(
  obligations,
  domain,
  bannedKeys = DISPLAY_KEYS
) {
  const offenders = findDisplayKeyOffenders(obligations, domain, bannedKeys)
  if (offenders.length > 0) {
    throw new Error(
      'Model purity violated — display logic does not live in the model: no ' +
        `obligation or domain entry may carry a display key (${[...bannedKeys].join(', ')}). ` +
        `Offending paths: ${offenders.join('; ')}`
    )
  }
}
