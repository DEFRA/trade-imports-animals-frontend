export const fail = (message) => {
  throw new TypeError(`Invalid persisted fulfilment: ${message}`)
}
