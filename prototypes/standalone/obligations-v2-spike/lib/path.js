/**
 * Path vocabulary for indexed obligations. An obligation INSTANCE is addressed
 * by a path array mixing string ids and numeric indices —
 * `['claims', 0, 'claimType']` — and `pathKey` stringifies it to a stable key
 * (`claims[0].claimType`) used as the scope/wipe identity.
 *
 * THE DEPTH-0 COLLAPSE is the zero-DOM compatibility keystone: a single-segment
 * path stringifies to the BARE id (`['claims'] -> 'claims'`), so every existing
 * `scope.has('claims')` / `scope.has('driverName')` keeps working byte-for-byte
 * once scope is keyed by path instead of id. Only genuinely-nested obligations
 * pick up the bracketed form.
 *
 * Pure and zero-I/O; the leaf of the recursion the reconcile/status/store layers
 * walk over.
 */
export const pathKey = (path) =>
  path.reduce(
    (key, seg, i) =>
      typeof seg === 'number'
        ? `${key}[${seg}]`
        : i === 0
          ? seg
          : `${key}.${seg}`,
    ''
  )

/** Inverse of `pathKey` — `'claims[0].claimType' -> ['claims', 0, 'claimType']`. */
export const parsePath = (key) =>
  key
    .split(/\.|\[|\]/)
    .filter((seg) => seg !== '')
    .map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg))

/** Read the value at a path, or undefined if any segment is missing. */
export const valueAt = (answers, path) =>
  path.reduce((value, seg) => (value == null ? undefined : value[seg]), answers)

/**
 * Return a copy of `answers` with `value` set at `path`, cloning only the spine
 * down to the leaf so the input is never mutated. Missing branches are created
 * as arrays or objects to match the next segment's type.
 */
export const setAt = (answers, path, value) => {
  if (path.length === 0) return value
  const [head, ...rest] = path
  const clone = Array.isArray(answers) ? [...answers] : { ...(answers ?? {}) }
  const child = answers?.[head] ?? (typeof rest[0] === 'number' ? [] : {})
  clone[head] = rest.length ? setAt(child, rest, value) : value
  return clone
}

/**
 * Delete the leaf at `path` IN PLACE — splice it out when it is an array index,
 * else delete the key. A no-op if any ancestor is already gone (so deleting a
 * subtree deepest-first is safe). Mirrors the old `delete answers[id]`: a
 * depth-0 path deletes the top-level key.
 */
export const deleteAt = (answers, path) => {
  if (path.length === 0) return
  const parent =
    path.length === 1 ? answers : valueAt(answers, path.slice(0, -1))
  if (parent == null) return
  const leaf = path[path.length - 1]
  if (Array.isArray(parent) && typeof leaf === 'number') parent.splice(leaf, 1)
  else delete parent[leaf]
}

/** True when `prefix` is a STRICT array-segment prefix of `path` (never a
 * string-prefix — so `['claims']` does not match a sibling `claimsExtra`). */
export const isStrictPathPrefix = (prefix, path) =>
  prefix.length < path.length && prefix.every((seg, i) => seg === path[i])

/**
 * Order two wipe paths so a `deleteAt` never invalidates a not-yet-applied
 * sibling. `deleteAt` SPLICES an array index, which renumbers later siblings, so
 * two sibling index deletes must run HIGHEST-INDEX-FIRST; and a nested delete
 * must run before the shallower delete that would remove its container. So:
 * at the first differing segment, larger numeric index first; otherwise (a
 * shared prefix) the deeper path first. Disjoint string branches are
 * independent — their order does not matter.
 */
export const wipeOrder = (a, b) => {
  const shared = Math.min(a.length, b.length)
  for (let i = 0; i < shared; i++) {
    if (a[i] === b[i]) continue
    if (typeof a[i] === 'number' && typeof b[i] === 'number') return b[i] - a[i]
    return 0
  }
  return b.length - a.length
}

/**
 * DESTROY every wiped instance in place. `wiped` is a list of path KEYS (the
 * `pathKey` form `reconcile` returns); they are parsed and `wipeOrder`-sorted so
 * sibling array-index splices run highest-index-first and a nested delete
 * precedes its container's — no delete ever shifts another. The single home of
 * scope-exit deletion, shared by `commit` and `removeEntryAt`.
 */
export const destroyWiped = (answers, wiped) => {
  for (const path of wiped.map(parsePath).sort(wipeOrder)) {
    deleteAt(answers, path)
  }
}
