export const compact = (source) =>
  Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined)
  )

export const orUndefined = (obj) => (Object.keys(obj).length ? obj : undefined)
