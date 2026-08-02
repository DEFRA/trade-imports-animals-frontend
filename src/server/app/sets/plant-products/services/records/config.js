export const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'
export const notificationsUrl = `${backendBaseUrl}/plant-products/notifications`
export const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key'
export const HTTP_NOT_FOUND = 404
