/**
 * DEPTH-0 COLLAPSE: a single-segment path stringifies to the BARE id
 * (`['commodityLines'] -> 'commodityLines'`), so every existing
 * `scope.has('commodityLines')` keeps working once scope is keyed by path.
 */
export const pathKey = (path) =>
  path.reduce(
    (key, segment, i) =>
      typeof segment === 'number'
        ? `${key}[${segment}]`
        : i === 0
          ? segment
          : `${key}.${segment}`,
    ''
  )

export const parsePath = (key) =>
  key
    .split(/\.|\[|\]/)
    .filter((segment) => segment !== '')
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment))

export const valueAt = (answers, path) =>
  path.reduce(
    (value, segment) => (value == null ? undefined : value[segment]),
    answers
  )

export const setAt = (answers, path, value) => {
  if (path.length === 0) return value
  const [head, ...rest] = path
  const clone = Array.isArray(answers) ? [...answers] : { ...(answers ?? {}) }
  const child = answers?.[head] ?? (typeof rest[0] === 'number' ? [] : {})
  clone[head] = rest.length ? setAt(child, rest, value) : value
  return clone
}

/**
 * Delete the leaf at `path` in place — splice when it is an array index, else
 * delete the key. A no-op if any ancestor is already gone, so deleting a
 * subtree deepest-first is safe.
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
 * string-prefix — so `['documents']` does not match a sibling
 * `documentsExtra`). */
export const isStrictPathPrefix = (prefix, path) =>
  prefix.length < path.length &&
  prefix.every((segment, i) => segment === path[i])

/**
 * Order two wipe paths so a `deleteAt` never invalidates a not-yet-applied
 * sibling. `deleteAt` SPLICES an array index, which renumbers later siblings, so
 * two sibling index deletes must run HIGHEST-INDEX-FIRST; and a nested delete
 * must run before the shallower delete that would remove its container. So:
 * at the first differing segment, larger numeric index first; otherwise (a
 * shared prefix) the deeper path first. Disjoint string branches are
 * independent — their order does not matter.
 */
export const wipeOrder = (pathA, pathB) => {
  const shared = Math.min(pathA.length, pathB.length)
  for (let i = 0; i < shared; i++) {
    if (pathA[i] === pathB[i]) continue
    if (typeof pathA[i] === 'number' && typeof pathB[i] === 'number') {
      return pathB[i] - pathA[i]
    }
    return 0
  }
  return pathB.length - pathA.length
}

/** Parsed keys are `wipeOrder`-sorted so no delete ever shifts another. */
export const destroyWiped = (answers, wiped) => {
  for (const path of wiped.map(parsePath).sort(wipeOrder)) {
    deleteAt(answers, path)
  }
}
