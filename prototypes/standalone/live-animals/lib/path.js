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

export const deleteAt = (answers, path) => {
  if (path.length === 0) return
  const parent =
    path.length === 1 ? answers : valueAt(answers, path.slice(0, -1))
  if (parent == null) return
  const leaf = path[path.length - 1]
  if (Array.isArray(parent) && typeof leaf === 'number') parent.splice(leaf, 1)
  else delete parent[leaf]
}

export const isStrictPathPrefix = (prefix, path) =>
  prefix.length < path.length &&
  prefix.every((segment, i) => segment === path[i])

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

export const destroyWiped = (answers, wiped) => {
  for (const path of wiped.map(parsePath).sort(wipeOrder)) {
    deleteAt(answers, path)
  }
}
