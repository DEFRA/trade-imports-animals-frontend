export const failProjection = (message) => {
  throw new TypeError(`Invalid answers projection: ${message}`)
}
