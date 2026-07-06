/**
 * Gate resolver — interpret an obligation's `gatedBy` metadata against
 * current fulfilments, producing per-instance-path scope decisions.
 *
 * Companion to `gates.js` (which is data-only). This module walks the
 * tagged gate tree, reads storage, projects between identity levels,
 * and combines results.
 *
 * Small composable helpers, each single-purpose. Public exports expose
 * the internal shape (`resolveGate`, `identityLevelOf`, etc.) so unit
 * tests can hit each layer directly.
 *
 * Vocabulary:
 *   - Identity level: an array of ancestor groups from top-most down to
 *     immediate parent. Length equals the composite-key depth of the
 *     obligation's storage. `[]` denotes notification-level (scalar).
 *   - Path: a `/`-delimited composite-key string. `''` is the scalar
 *     path.
 *   - Match set: a `Set<path>` of paths at some identity level where a
 *     gate is satisfied.
 */

const PATH_DELIMITER = '/'
const SCALAR_PATH = ''

// -----------------------------------------------------------------------------
// Public: resolveGatedBy
// -----------------------------------------------------------------------------

/**
 * Given an obligation's `gatedBy` metadata plus current fulfilments,
 * produce per-instance-path scope decisions.
 *
 * Returns a `Map<path, decision>` where `decision` is
 * `{ inScope, status?, reasons? }`. For notification-level obligations
 * the map has one entry keyed by `''`. For indexed obligations there
 * is one entry per current instance-path at the obligation's identity
 * level.
 *
 * Two `gatedBy` forms supported:
 *   - Shortcut: a bare gate (`whenTrue` = in-scope with the
 *     obligation's own status, `whenFalse` = out-of-scope).
 *   - Extended: `{ when, whenTrue, whenFalse }` for retain-value or
 *     status-swap patterns.
 */
export function resolveGatedBy(
  gatedBy,
  obligation,
  fulfilments,
  obligationsById
) {
  const { when, whenTrue, whenFalse } = normaliseGatedBy(gatedBy, obligation)
  const gateResult = resolveGate(when, fulfilments, obligationsById)
  const obligationLevel = identityLevelOf(obligation)
  const inScopePaths = projectMatches(
    gateResult.level,
    obligationLevel,
    gateResult.matches,
    fulfilments,
    obligationsById
  )
  const allPaths = enumerateInstancePaths(
    obligationLevel,
    fulfilments,
    obligationsById
  )
  const decisions = new Map()
  for (const path of allPaths) {
    decisions.set(path, inScopePaths.has(path) ? whenTrue : whenFalse)
  }
  return decisions
}

// -----------------------------------------------------------------------------
// Public: resolveGate — recursive walker
// -----------------------------------------------------------------------------

/**
 * Recursively resolve a gate against current fulfilments. Returns
 * `{ level, matches }` where `level` is the identity level of the
 * result and `matches` is a `Set<path>` of paths satisfying the gate.
 */
export function resolveGate(gate, fulfilments, obligationsById) {
  if (gate.type === 'allowListed') {
    return resolveAllowListed(gate, fulfilments)
  }
  if (gate.type === 'matches') {
    return resolveMatches(gate, fulfilments)
  }
  if (gate.type === 'present') {
    return resolvePresent(gate, fulfilments)
  }
  if (gate.type === 'and') {
    return resolveComposition(gate.gates, 'and', fulfilments, obligationsById)
  }
  if (gate.type === 'or') {
    return resolveComposition(gate.gates, 'or', fulfilments, obligationsById)
  }
  if (gate.type === 'not') {
    return resolveNot(gate, fulfilments, obligationsById)
  }
  if (gate.type === 'any') {
    return resolveAny(gate, fulfilments, obligationsById)
  }
  if (gate.type === 'every') {
    return resolveEvery(gate, fulfilments, obligationsById)
  }
  throw new Error(`Unknown gate type: ${gate.type}`)
}

// -----------------------------------------------------------------------------
// Public: identityLevelOf
// -----------------------------------------------------------------------------

/**
 * The chain of ancestor groups (top-most down to immediate parent,
 * excluding self). `[]` for notification-level obligations.
 */
export function identityLevelOf(obligation) {
  const chain = []
  let cur = obligation.within
  while (cur) {
    chain.unshift(cur)
    cur = cur.within
  }
  return chain
}

// -----------------------------------------------------------------------------
// Public: enumerateInstancePaths
// -----------------------------------------------------------------------------

/**
 * All instance-paths currently present at the given identity level.
 * Scans storage across every obligation whose identity level starts
 * with `level`, taking the first `level.length` composite-key segments
 * of each stored key.
 *
 * For scalar level (`[]`) returns `Set([''])`.
 */
export function enumerateInstancePaths(level, fulfilments, obligationsById) {
  if (level.length === 0) return new Set([SCALAR_PATH])
  const paths = new Set()
  for (const obligation of obligationsById.values()) {
    const oLevel = identityLevelOf(obligation)
    if (!levelIsPrefixOf(level, oLevel)) continue
    const stored = fulfilments[obligation.id]
    if (!isKeyedRecord(stored)) continue
    for (const key of Object.keys(stored)) {
      const segments = key.split(PATH_DELIMITER)
      if (segments.length >= level.length) {
        paths.add(segments.slice(0, level.length).join(PATH_DELIMITER))
      }
    }
  }
  return paths
}

// -----------------------------------------------------------------------------
// Public: projectMatches
// -----------------------------------------------------------------------------

/**
 * Project a match set from one identity level to another.
 *
 * Same level → returned unchanged.
 * `fromLevel` is a prefix of `toLevel` (broader → deeper) → expand:
 *   each match at `fromLevel` yields every deeper path currently
 *   present with that prefix.
 * Deeper → shallower → error. Use `any` / `every` for aggregation.
 */
export function projectMatches(
  fromLevel,
  toLevel,
  matches,
  fulfilments,
  obligationsById
) {
  if (levelsEqual(fromLevel, toLevel)) return matches
  if (levelIsPrefixOf(fromLevel, toLevel)) {
    const expanded = new Set()
    const allTargetPaths = enumerateInstancePaths(
      toLevel,
      fulfilments,
      obligationsById
    )
    for (const targetPath of allTargetPaths) {
      const prefixLen = fromLevel.length
      const prefix = targetPath
        .split(PATH_DELIMITER)
        .slice(0, prefixLen)
        .join(PATH_DELIMITER)
      if (matches.has(prefix)) expanded.add(targetPath)
    }
    return expanded
  }
  throw new Error(
    'Cannot project matches from a deeper identity level to a shallower one. ' +
      'Use any() or every() to aggregate.'
  )
}

// -----------------------------------------------------------------------------
// Internal: normaliseGatedBy
// -----------------------------------------------------------------------------

// The shortcut form is a bare gate object (has a `type` discriminator).
// The extended form wraps `{ when, whenTrue, whenFalse }`. Distinguish
// by checking for the `when` key.
function normaliseGatedBy(gatedBy, obligation) {
  if (gatedBy.when) return gatedBy
  return {
    when: gatedBy,
    whenTrue: {
      inScope: true,
      status: obligation.status,
      reasons: [autoReason(obligation)]
    },
    whenFalse: { inScope: false }
  }
}

function autoReason(obligation) {
  return {
    code: `obligation.${obligation.name}.applicable.becauseGateSatisfied`,
    explanation: `${obligation.name} applies when its gatedBy condition is satisfied`
  }
}

// -----------------------------------------------------------------------------
// Internal: primitive gate resolvers
// -----------------------------------------------------------------------------

function resolveAllowListed(gate, fulfilments) {
  const { obligation, values } = gate
  return resolvePerStoredValue(obligation, fulfilments, (v) =>
    values.includes(v)
  )
}

function resolveMatches(gate, fulfilments) {
  const { obligation, value } = gate
  return resolvePerStoredValue(obligation, fulfilments, (v) => v === value)
}

function resolvePresent(gate, fulfilments) {
  const { obligation } = gate
  const level = identityLevelOf(obligation)
  const stored = fulfilments[obligation.id]
  const matches = new Set()
  if (level.length === 0) {
    if (stored !== undefined) matches.add(SCALAR_PATH)
  } else if (isKeyedRecord(stored)) {
    for (const key of Object.keys(stored)) matches.add(key)
  }
  return { level, matches }
}

// Shared helper for value-testing primitives (allowListed, matches).
function resolvePerStoredValue(obligation, fulfilments, predicate) {
  const level = identityLevelOf(obligation)
  const stored = fulfilments[obligation.id]
  const matches = new Set()
  if (level.length === 0) {
    if (predicate(stored)) matches.add(SCALAR_PATH)
  } else if (isKeyedRecord(stored)) {
    for (const [key, value] of Object.entries(stored)) {
      if (predicate(value)) matches.add(key)
    }
  }
  return { level, matches }
}

// -----------------------------------------------------------------------------
// Internal: composition + negation
// -----------------------------------------------------------------------------

// `and()` with no sub-gates is trivially true; `or()` with no sub-gates
// is trivially false. Both produce a scalar result.
function resolveComposition(subGates, operator, fulfilments, obligationsById) {
  if (subGates.length === 0) {
    return {
      level: [],
      matches: operator === 'and' ? new Set([SCALAR_PATH]) : new Set()
    }
  }
  const resolved = subGates.map((g) =>
    resolveGate(g, fulfilments, obligationsById)
  )
  const targetLevel = deepestLevel(resolved.map((r) => r.level))
  const projected = resolved.map((r) =>
    projectMatches(
      r.level,
      targetLevel,
      r.matches,
      fulfilments,
      obligationsById
    )
  )
  const matches =
    operator === 'and' ? intersectSets(projected) : unionSets(projected)
  return { level: targetLevel, matches }
}

function resolveNot(gate, fulfilments, obligationsById) {
  const inner = resolveGate(gate.gate, fulfilments, obligationsById)
  const allPaths = enumerateInstancePaths(
    inner.level,
    fulfilments,
    obligationsById
  )
  const matches = new Set()
  for (const path of allPaths) {
    if (!inner.matches.has(path)) matches.add(path)
  }
  return { level: inner.level, matches }
}

// -----------------------------------------------------------------------------
// Internal: projections (any / every)
// -----------------------------------------------------------------------------

// `any(indexedObligation, subGate)` reduces to scalar true iff the
// sub-gate matches anywhere.
function resolveAny(gate, fulfilments, obligationsById) {
  const inner = resolveGate(gate.gate, fulfilments, obligationsById)
  const matches = inner.matches.size > 0 ? new Set([SCALAR_PATH]) : new Set()
  return { level: [], matches }
}

// `every(indexedObligation, subGate)` reduces to scalar true iff the
// sub-gate matches at every currently-present path at its own level.
// Vacuously true when no such paths exist.
function resolveEvery(gate, fulfilments, obligationsById) {
  const inner = resolveGate(gate.gate, fulfilments, obligationsById)
  const allPaths = enumerateInstancePaths(
    inner.level,
    fulfilments,
    obligationsById
  )
  const satisfied =
    allPaths.size === 0 ||
    [...allPaths].every((path) => inner.matches.has(path))
  const matches = satisfied ? new Set([SCALAR_PATH]) : new Set()
  return { level: [], matches }
}

// -----------------------------------------------------------------------------
// Internal: level and set utilities
// -----------------------------------------------------------------------------

function deepestLevel(levels) {
  return levels.reduce(
    (deepest, level) => (level.length > deepest.length ? level : deepest),
    []
  )
}

function levelsEqual(a, b) {
  if (a.length !== b.length) return false
  return a.every((g, i) => g.id === b[i].id)
}

function levelIsPrefixOf(shorter, longer) {
  if (shorter.length > longer.length) return false
  return shorter.every((g, i) => g.id === longer[i].id)
}

function intersectSets(sets) {
  if (sets.length === 0) return new Set()
  const [first, ...rest] = sets
  const result = new Set()
  for (const value of first) {
    if (rest.every((s) => s.has(value))) result.add(value)
  }
  return result
}

function unionSets(sets) {
  const result = new Set()
  for (const s of sets) for (const v of s) result.add(v)
  return result
}

// Keyed record: plain object storing composite-key → value pairs.
// Excludes arrays (which are multi-select values) and primitives.
function isKeyedRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
