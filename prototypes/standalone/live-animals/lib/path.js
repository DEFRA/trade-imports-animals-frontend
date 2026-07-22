export const pathKey = (path) =>
  path.reduce(
    (key, segment, index) =>
      typeof segment === 'number'
        ? `${key}[${segment}]`
        : index === 0
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

const firstDivergingIndex = (pathA, pathB) => {
  const shared = Math.min(pathA.length, pathB.length)
  for (let index = 0; index < shared; index++) {
    if (pathA[index] !== pathB[index]) return index
  }
  return -1
}

const orderByDivergence = (pathA, pathB, index) =>
  typeof pathA[index] === 'number' && typeof pathB[index] === 'number'
    ? pathB[index] - pathA[index]
    : 0

export const wipeOrder = (pathA, pathB) => {
  const index = firstDivergingIndex(pathA, pathB)
  return index === -1
    ? pathB.length - pathA.length
    : orderByDivergence(pathA, pathB, index)
}

export const destroyWiped = (answers, wiped) => {
  for (const path of wiped.map(parsePath).sort(wipeOrder)) {
    deleteAt(answers, path)
  }
}
