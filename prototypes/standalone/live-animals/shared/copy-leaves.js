/**
 * Walk a copy module and return its leaves as `{ path, value }` entries.
 * A leaf is anything that is not a plain object/array node: a string, or
 * a string-returning function (the parameterised-copy convention).
 * @param {object} node - the copy-module node to walk.
 * @param {string[]} [path=[]] - internal recursion accumulator; omit when calling.
 * @returns {{ path: string, value: * }[]}
 */
export const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

/** True when a leaf value satisfies the copy convention. */
export const isCopyLeaf = (value) =>
  typeof value === 'function' ||
  (typeof value === 'string' && value.trim().length > 0)
