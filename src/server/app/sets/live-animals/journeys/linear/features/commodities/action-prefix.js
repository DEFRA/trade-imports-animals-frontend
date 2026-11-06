export const actionsPrefixed = (prefix) => ({
  actionFor: (key) => `${prefix}${key}`,
  isAction: (action) => typeof action === 'string' && action.startsWith(prefix),
  keyOf: (action) => action.slice(prefix.length)
})
